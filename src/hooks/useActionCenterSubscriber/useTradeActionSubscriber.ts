import { usePrevious } from '@chakra-ui/react'
import { fromBaseUnit } from '@shapeshiftoss/utils'
import { useEffect } from 'react'
import { useTranslate } from 'react-polyglot'

import { useLocaleFormatter } from '../useLocaleFormatter/useLocaleFormatter'

import { useCurrentHopIndex } from '@/components/MultiHopTrade/components/TradeConfirm/hooks/useCurrentHopIndex'
import { actionCenterSlice } from '@/state/slices/actionSlice/actionSlice'
import { ActionCenterType, ActionStatus } from '@/state/slices/actionSlice/types'
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
import { useAppDispatch, useAppSelector } from '@/state/store'

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

  useEffect(() => {
    if (!tradeExecution) return

    const firstStep = tradeQuote?.steps[0]
    const lastStep = tradeQuote?.steps[tradeQuote.steps.length - 1]

    if (!firstStep || !lastStep) return
    if (!tradeExecution.firstHop.swap.sellTxHash) return
    if (!sellAccountId) return

    if (
      tradeQuote.quoteOrRate === 'quote' &&
      tradeExecution.state === TradeExecutionState.FirstHop &&
      previousTxHash !== tradeExecution.firstHop.swap.sellTxHash
    ) {
      dispatch(
        actionCenterSlice.actions.upsertAction({
          type: ActionCenterType.Swap,
          status: ActionStatus.Pending,
          title: translate('notificationCenter.notificationsTitles.swap.pending', {
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
            swapId: tradeQuote.id,
            quote: tradeQuote,
            stepIndex: currentHopIndex,
            sellTxHash: tradeExecution.firstHop.swap.sellTxHash,
            sellAccountId,
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
  ])
}
