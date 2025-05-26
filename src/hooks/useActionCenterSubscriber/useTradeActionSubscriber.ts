import { usePrevious } from '@chakra-ui/react'
import type { Swap } from '@shapeshiftoss/swapper'
import { isLifiTradeQuote, SwapStatus } from '@shapeshiftoss/swapper'
import { fromBaseUnit } from '@shapeshiftoss/utils'
import { uuidv4 } from '@walletconnect/utils'
import { useEffect } from 'react'
import { useTranslate } from 'react-polyglot'

import { useLocaleFormatter } from '../useLocaleFormatter/useLocaleFormatter'

import { useCurrentHopIndex } from '@/components/MultiHopTrade/components/TradeConfirm/hooks/useCurrentHopIndex'
import { actionCenterSlice } from '@/state/slices/actionSlice/actionSlice'
import { ActionCenterType, ActionStatus } from '@/state/slices/actionSlice/types'
import { selectSwapByQuoteId } from '@/state/slices/swapSlice/selectors'
import { swapSlice } from '@/state/slices/swapSlice/swapSlice'
import {
  selectFirstHopSellAccountId,
  selectInputBuyAsset,
  selectInputSellAsset,
} from '@/state/slices/tradeInputSlice/selectors'
import {
  selectActiveQuote,
  selectConfirmedTradeExecution,
} from '@/state/slices/tradeQuoteSlice/selectors'
import { TradeExecutionState } from '@/state/slices/tradeQuoteSlice/types'
import { store, useAppDispatch, useAppSelector } from '@/state/store'

export const useTradeActionSubscriber = () => {
  const dispatch = useAppDispatch()
  const translate = useTranslate()

  const {
    number: { toCrypto },
  } = useLocaleFormatter()

  const tradeExecution = useAppSelector(selectConfirmedTradeExecution)
  const tradeSellAsset = useAppSelector(selectInputSellAsset)
  const tradeBuyAsset = useAppSelector(selectInputBuyAsset)
  const tradeQuote = useAppSelector(selectActiveQuote)
  const previousTradeExecutionState = usePrevious(tradeExecution?.state)
  const previousTradeQuoteId = usePrevious(tradeQuote?.id)
  const currentHopIndex = useCurrentHopIndex()
  const previousTxHash = usePrevious(tradeExecution?.firstHop.swap.sellTxHash)
  const sellAccountId = useAppSelector(selectFirstHopSellAccountId)
  const previousQuoteOrRate = usePrevious(tradeQuote?.quoteOrRate)

  // Create swap and action after user confirmed the intent
  useEffect(() => {
    if (!tradeExecution) return

    const firstStep = tradeQuote?.steps[0]
    const lastStep = tradeQuote?.steps[tradeQuote.steps.length - 1]

    if (!firstStep || !lastStep) return
    if (!sellAccountId) return

    if (tradeQuote.quoteOrRate === 'quote' && previousQuoteOrRate === 'rate') {
      const swap: Swap = {
        id: uuidv4(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        quoteId: tradeQuote.id,
        metadata: {
          lifiRoute: isLifiTradeQuote(tradeQuote) ? tradeQuote.selectedLifiRoute : undefined,
          chainflipSwapId: firstStep?.chainflipSpecific?.chainflipSwapId,
          sellTxHash: tradeExecution.firstHop.swap.sellTxHash,
          stepIndex: currentHopIndex,
          sellAccountId,
          swapperName: tradeQuote.swapperName,
          sellAsset: firstStep.sellAsset,
          buyAsset: lastStep.buyAsset,
          sellAmountCryptoBaseUnit:
            tradeQuote.steps[0].sellAmountIncludingProtocolFeesCryptoBaseUnit,
          buyAmountCryptoBaseUnit:
            tradeQuote.steps[tradeQuote.steps.length - 1].buyAmountAfterFeesCryptoBaseUnit,
        },
        status: SwapStatus.Pending,
      }

      dispatch(swapSlice.actions.upsertSwap(swap))

      dispatch(
        actionCenterSlice.actions.upsertAction({
          type: ActionCenterType.Swap,
          status: ActionStatus.Pending,
          title: translate('notificationCenter.notificationsTitles.swap.title', {
            sellAmountAndSymbol: toCrypto(
              fromBaseUnit(
                firstStep.sellAmountIncludingProtocolFeesCryptoBaseUnit,
                tradeSellAsset.precision,
              ),
              tradeSellAsset.symbol,
              {
                maximumFractionDigits: 8,
                omitDecimalTrailingZeros: true,
                abbreviated: true,
                truncateLargeNumbers: true,
              },
            ),
            buyAmountAndSymbol: toCrypto(
              fromBaseUnit(lastStep.buyAmountAfterFeesCryptoBaseUnit, tradeBuyAsset.precision),
              tradeBuyAsset.symbol,
              {
                maximumFractionDigits: 8,
                omitDecimalTrailingZeros: true,
                abbreviated: true,
                truncateLargeNumbers: true,
              },
            ),
          }),
          metadata: {
            swapId: swap.id,
          },
          assetIds: [tradeSellAsset.assetId, tradeBuyAsset.assetId],
        }),
      )
    }
  }, [
    tradeExecution,
    dispatch,
    translate,
    toCrypto,
    tradeSellAsset,
    tradeBuyAsset,
    tradeQuote,
    previousTradeExecutionState,
    previousTradeQuoteId,
    currentHopIndex,
    previousTxHash,
    sellAccountId,
    previousQuoteOrRate,
  ])

  // Update swap with tx hash or swapId for chainflip when the user did the first step
  useEffect(() => {
    if (!tradeExecution) return
    if (!tradeExecution.firstHop.swap.sellTxHash) return
    if (!tradeQuote) return

    const swap = selectSwapByQuoteId(store.getState(), {
      quoteId: tradeQuote.id,
    })

    if (
      tradeQuote.quoteOrRate === 'quote' &&
      tradeExecution.state === TradeExecutionState.FirstHop &&
      tradeExecution.firstHop.swap.sellTxHash &&
      swap?.status === SwapStatus.Pending
    ) {
      dispatch(
        swapSlice.actions.updateSwap({
          id: swap.id,
          metadata: {
            ...swap.metadata,
            sellTxHash: tradeExecution.firstHop.swap.sellTxHash,
          },
        }),
      )
    }
  }, [tradeExecution, dispatch, tradeQuote, previousTxHash])

  // Cancel swap and action if the user did confirm the intent but quoteId changed and the tx hash is not set
  useEffect(() => {
    if (!tradeExecution) return
    if (!tradeExecution.firstHop.swap.sellTxHash) return
    if (!tradeQuote) return

    if (
      tradeQuote.quoteOrRate === 'quote' &&
      !previousTxHash &&
      previousTradeQuoteId !== tradeQuote.id
    ) {
      const swap = selectSwapByQuoteId(store.getState(), {
        quoteId: previousTradeQuoteId,
      })

      if (!swap) return

      dispatch(
        swapSlice.actions.updateSwap({
          id: swap.id,
          status: SwapStatus.Cancelled,
        }),
      )
      dispatch(
        actionCenterSlice.actions.updateAction({
          status: ActionStatus.Cancelled,
        }),
      )
    }
  }, [tradeExecution, dispatch, tradeQuote, previousTxHash, previousTradeQuoteId])
}
