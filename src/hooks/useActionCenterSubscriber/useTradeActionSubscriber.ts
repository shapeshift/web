import { usePrevious, useToast } from '@chakra-ui/react'
import type { Swap } from '@shapeshiftoss/swapper'
import { isLifiTradeQuote, SwapStatus } from '@shapeshiftoss/swapper'
import type { QuoteId } from '@shapeshiftoss/types'
import { fromBaseUnit } from '@shapeshiftoss/utils'
import { useQueries } from '@tanstack/react-query'
import { uuidv4 } from '@walletconnect/utils'
import { useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { useLocaleFormatter } from '../useLocaleFormatter/useLocaleFormatter'
import { useWallet } from '../useWallet/useWallet'
import { getTradeStatusHandler } from './checkStatusHandlers/getTradeStatusHandler'

import { useCurrentHopIndex } from '@/components/MultiHopTrade/components/TradeConfirm/hooks/useCurrentHopIndex'
import { actionCenterSlice } from '@/state/slices/actionSlice/actionSlice'
import {
  ActionCenterType,
  ActionStatus,
  isTradePayloadDiscriminator,
} from '@/state/slices/actionSlice/types'
import { selectPendingSwapActionsFilteredByWallet } from '@/state/slices/selectors'
import { selectSwapById, selectSwapByQuoteId } from '@/state/slices/swapSlice/selectors'
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
  const pendingSwapActions = useAppSelector(selectPendingSwapActionsFilteredByWallet)
  const toast = useToast()
  const swapByIds = useAppSelector(selectSwapById)
  const {
    state: { isConnected },
  } = useWallet()

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
        quoteId: tradeQuote.id as unknown as QuoteId,
        sellTxHash: tradeExecution.firstHop.swap.sellTxHash,
        sellAccountId,
        swapperName: tradeQuote.swapperName,
        sellAsset: firstStep.sellAsset,
        buyAsset: lastStep.buyAsset,
        sellAmountCryptoBaseUnit: tradeQuote.steps[0].sellAmountIncludingProtocolFeesCryptoBaseUnit,
        buyAmountCryptoBaseUnit:
          tradeQuote.steps[tradeQuote.steps.length - 1].buyAmountAfterFeesCryptoBaseUnit,
        metadata: {
          lifiRoute: isLifiTradeQuote(tradeQuote) ? tradeQuote.selectedLifiRoute : undefined,
          chainflipSwapId: firstStep?.chainflipSpecific?.chainflipSwapId,
          stepIndex: currentHopIndex,
        },
        status: SwapStatus.Pending,
      }

      dispatch(swapSlice.actions.upsertSwap(swap))

      dispatch(
        actionCenterSlice.actions.upsertAction({
          type: ActionCenterType.Swap,
          status: ActionStatus.Pending,
          title: translate('notificationCenter.notificationTitle', {
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
          initiatorAccountId: sellAccountId,
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
      quoteId: tradeQuote.id as unknown as QuoteId,
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
          sellTxHash: tradeExecution.firstHop.swap.sellTxHash,
        }),
      )
    }
  }, [tradeExecution, dispatch, tradeQuote, previousTxHash])

  // Update actions status when swap is confirmed or failed
  const actionsQueries = useMemo(() => {
    return pendingSwapActions
      .map(action => {
        switch (action.type) {
          case ActionCenterType.Swap: {
            if (!isTradePayloadDiscriminator(action)) return undefined

            const swap = swapByIds[action.metadata.swapId]

            if (!swap) return undefined

            return {
              queryKey: ['actionCenterPolling', action.id, swap.id, swap.sellTxHash],
              queryFn: () =>
                getTradeStatusHandler({
                  toast,
                  swap,
                  translate,
                }),
              refetchInterval: 10000,
              enabled: Boolean(
                isTradePayloadDiscriminator(action) &&
                  action.status === ActionStatus.Pending &&
                  isConnected,
              ),
            }
          }
          default:
            return undefined
        }
      })
      .filter((query): query is NonNullable<typeof query> => query !== undefined)
  }, [pendingSwapActions, toast, translate, isConnected, swapByIds])

  useQueries({
    queries: actionsQueries,
  })
}
