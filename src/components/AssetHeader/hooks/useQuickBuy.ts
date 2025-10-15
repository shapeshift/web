import type { AssetId } from '@shapeshiftoss/caip'
import type { SupportedTradeQuoteStepIndex } from '@shapeshiftoss/swapper'
import { TransactionExecutionState } from '@shapeshiftoss/swapper'
import { bn } from '@shapeshiftoss/utils'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useCurrentHopIndex } from '../../MultiHopTrade/components/TradeConfirm/hooks/useCurrentHopIndex'
import { useGetTradeRates } from '../../MultiHopTrade/hooks/useGetTradeQuotes/useGetTradeRates'

import { swapperApi } from '@/state/apis/swapper/swapperApi'
import { TradeQuoteValidationError } from '@/state/apis/swapper/types'
import { selectMarketDataByAssetIdUserCurrency } from '@/state/slices/marketDataSlice/selectors'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import {
  selectAssetById,
  selectFeeAssetById,
  selectPortfolioCryptoPrecisionBalanceByFilter,
  selectPortfolioUserCurrencyBalanceByAssetId,
} from '@/state/slices/selectors'
import { tradeInput } from '@/state/slices/tradeInputSlice/tradeInputSlice'
import {
  selectConfirmedQuote,
  selectConfirmedTradeExecutionState,
  selectFirstHop,
  selectHopExecutionMetadata,
  selectLastHop,
  selectSortedTradeQuotes,
} from '@/state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from '@/state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

export type QuickBuyState =
  | { status: 'idle'; amount?: undefined; messageKey?: undefined }
  | { status: 'error'; amount: number; messageKey: string }
  | { status: 'confirming' | 'executing' | 'success'; amount: number; messageKey?: undefined }

const DEFAULT_STATE: QuickBuyState = {
  status: 'idle',
  amount: undefined,
  messageKey: undefined,
}

const SUCCESS_TIMEOUT_MS = 7000

interface UseQuickBuyParams {
  assetId: AssetId
}

interface UseQuickBuyReturn {
  quickBuyState: QuickBuyState
  isNativeAsset: boolean
  estimatedBuyAmountCryptoPrecision: string | null

  asset: ReturnType<typeof selectAssetById>
  feeAsset: ReturnType<typeof selectFeeAssetById>
  feeAssetBalanceCryptoPrecision: string
  feeAssetBalanceUserCurrency: string
  quickBuyAmounts: number[]

  confirmedQuote: ReturnType<typeof selectConfirmedQuote>
  tradeQuoteStep: ReturnType<typeof selectFirstHop> | ReturnType<typeof selectLastHop> | undefined
  confirmedTradeExecutionState: ReturnType<typeof selectConfirmedTradeExecutionState>
  currentHopIndex: SupportedTradeQuoteStepIndex

  actions: {
    startPurchase: (amount: number) => void
    confirmPurchase: () => void
    cancelPurchase: () => void
    dismissError: () => void
  }
}

export const useQuickBuy = ({ assetId }: UseQuickBuyParams): UseQuickBuyReturn => {
  const dispatch = useAppDispatch()

  const [quickBuyState, setQuickBuyState] = useState<QuickBuyState>(DEFAULT_STATE)
  const hasInitializedTradeRef = useRef(false)
  const successTimerRef = useRef<NodeJS.Timeout | null>(null)

  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const feeAsset = useAppSelector(state => selectFeeAssetById(state, assetId))
  const quickBuyAmounts = useAppSelector(preferences.selectors.selectQuickBuyAmounts)
  const sortedTradeQuotes = useAppSelector(selectSortedTradeQuotes)
  const confirmedQuote = useAppSelector(selectConfirmedQuote)
  const confirmedTradeExecutionState = useAppSelector(selectConfirmedTradeExecutionState)

  const assetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, assetId),
  )
  const feeAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, feeAsset?.assetId ?? ''),
  )

  const feeAssetFilter = useMemo(() => ({ assetId: feeAsset?.assetId }), [feeAsset?.assetId])
  const feeAssetBalanceCryptoPrecision = useAppSelector(s =>
    selectPortfolioCryptoPrecisionBalanceByFilter(s, feeAssetFilter),
  )
  const feeAssetBalanceUserCurrency = useAppSelector(
    state => selectPortfolioUserCurrencyBalanceByAssetId(state, feeAssetFilter) ?? '0',
  )

  const currentHopIndex = useCurrentHopIndex()
  const tradeQuoteFirstHop = useAppSelector(selectFirstHop)
  const tradeQuoteLastHop = useAppSelector(selectLastHop)
  const tradeQuoteStep = useMemo(() => {
    return currentHopIndex === 0 ? tradeQuoteFirstHop : tradeQuoteLastHop
  }, [currentHopIndex, tradeQuoteFirstHop, tradeQuoteLastHop])

  const hopExecutionMetadataFilter = useMemo(() => {
    if (!confirmedQuote?.id) return undefined
    return { tradeId: confirmedQuote.id, hopIndex: currentHopIndex }
  }, [confirmedQuote?.id, currentHopIndex])

  const hopExecutionMetadata = useAppSelector(state =>
    hopExecutionMetadataFilter
      ? selectHopExecutionMetadata(state, hopExecutionMetadataFilter)
      : undefined,
  )

  const isNativeAsset = useMemo(() => {
    return Boolean(asset && feeAsset && asset.assetId === feeAsset.assetId)
  }, [asset, feeAsset])

  const estimatedBuyAmountCryptoPrecision = useMemo(() => {
    const { amount, status } = quickBuyState
    if ((status !== 'confirming' && status !== 'executing') || !assetMarketData?.price) {
      return null
    }
    const tokenAmountInUserCurrency = bn(amount).dividedBy(bn(assetMarketData.price))
    return tokenAmountInUserCurrency.toString()
  }, [quickBuyState, assetMarketData?.price])

  const resetTrade = useCallback(() => {
    hasInitializedTradeRef.current = false
    dispatch(tradeQuoteSlice.actions.clear())
    dispatch(swapperApi.util.invalidateTags(['TradeQuote']))
    dispatch(tradeInput.actions.clear())
  }, [dispatch])

  const clearSuccessTimer = useCallback(() => {
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current)
      successTimerRef.current = null
    }
  }, [])

  const setErrorState = useCallback(
    (messageKey: string, amount: number) => {
      setQuickBuyState({ status: 'error', amount, messageKey })
      resetTrade()
    },
    [resetTrade],
  )

  const setSuccessState = useCallback(
    (amount: number) => {
      setQuickBuyState({ status: 'success', amount })
      resetTrade()

      clearSuccessTimer()
      successTimerRef.current = setTimeout(() => {
        setQuickBuyState(currentState =>
          currentState.status === 'success' ? DEFAULT_STATE : currentState,
        )
      }, SUCCESS_TIMEOUT_MS)
    },
    [resetTrade, clearSuccessTimer],
  )

  const startPurchase = useCallback(
    (amount: number) => {
      if (!asset || !feeAsset || !feeAssetMarketData) return

      const estimatedSellAmountCryptoPrecision = bn(amount)
        .dividedBy(bn(feeAssetMarketData.price))
        .toString()

      dispatch(
        tradeInput.actions.setQuickBuySelection({
          sellAsset: feeAsset,
          buyAsset: asset,
          sellAmountCryptoPrecision: estimatedSellAmountCryptoPrecision,
        }),
      )

      setQuickBuyState({ status: 'confirming', amount })
    },
    [asset, dispatch, feeAsset, feeAssetMarketData],
  )

  const confirmPurchase = useCallback(() => {
    if (quickBuyState.status !== 'confirming') return
    setQuickBuyState({ status: 'executing', amount: quickBuyState.amount })
  }, [quickBuyState.amount, quickBuyState.status])

  const cancelPurchase = useCallback(() => {
    setQuickBuyState(DEFAULT_STATE)
    resetTrade()
    clearSuccessTimer()
  }, [resetTrade, clearSuccessTimer])

  const dismissError = useCallback(() => {
    setQuickBuyState(DEFAULT_STATE)
  }, [])

  useGetTradeRates()

  useEffect(() => {
    if (
      quickBuyState.status !== 'confirming' ||
      !sortedTradeQuotes.length ||
      hasInitializedTradeRef.current
    ) {
      return
    }

    const bestNoErrorQuote = sortedTradeQuotes.find(quote => quote.errors.length === 0)

    // Insufficient funds if we get no "best quote" but we have something that's only error is insufficientFunds
    const isSomeQuoteInsufficientFunds = sortedTradeQuotes.some(
      quote =>
        quote.errors.length === 1 &&
        quote.errors[0].error === TradeQuoteValidationError.InsufficientFirstHopAssetBalance,
    )

    if (!bestNoErrorQuote?.quote) {
      const errorKey = isSomeQuoteInsufficientFunds
        ? 'quickBuy.error.insufficientFunds'
        : 'quickBuy.error.noQuote'
      setErrorState(errorKey, quickBuyState.amount ?? 0)
      return
    }

    dispatch(tradeQuoteSlice.actions.initializeQuickBuyTrade(bestNoErrorQuote.quote))
    hasInitializedTradeRef.current = true
  }, [dispatch, quickBuyState.status, quickBuyState.amount, sortedTradeQuotes, setErrorState])

  useEffect(() => {
    if (quickBuyState.status !== 'executing') return

    const swapState = hopExecutionMetadata?.swap.state

    if (swapState === TransactionExecutionState.Failed) {
      setErrorState('quickBuy.error.failed', quickBuyState.amount ?? 0)
    } else if (swapState === TransactionExecutionState.Complete) {
      setSuccessState(quickBuyState.amount ?? 0)
    }
  }, [
    hopExecutionMetadata,
    quickBuyState.status,
    quickBuyState.amount,
    setErrorState,
    setSuccessState,
  ])

  useEffect(() => {
    return () => {
      resetTrade()
      clearSuccessTimer()
    }
  }, [resetTrade, clearSuccessTimer])

  return {
    quickBuyState,
    isNativeAsset,
    estimatedBuyAmountCryptoPrecision,

    asset,
    feeAsset,
    feeAssetBalanceCryptoPrecision,
    feeAssetBalanceUserCurrency,
    quickBuyAmounts,

    confirmedQuote,
    tradeQuoteStep,
    confirmedTradeExecutionState,
    currentHopIndex,

    actions: {
      startPurchase,
      confirmPurchase,
      cancelPurchase,
      dismissError,
    },
  }
}
