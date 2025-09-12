import type { AssetId } from '@shapeshiftoss/caip'
import type { SupportedTradeQuoteStepIndex } from '@shapeshiftoss/swapper'
import { SwapStatus, TransactionExecutionState } from '@shapeshiftoss/swapper'
import { bn } from '@shapeshiftoss/utils'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useCurrentHopIndex } from '../../MultiHopTrade/components/TradeConfirm/hooks/useCurrentHopIndex'
import { useMixpanel } from '../../MultiHopTrade/components/TradeConfirm/hooks/useMixpanel'
import { useGetTradeRates } from '../../MultiHopTrade/hooks/useGetTradeQuotes/useGetTradeRates'

import { getMixpanelEventData } from '@/components/MultiHopTrade/helpers'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'
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
import { selectCurrentSwap } from '@/state/slices/swapSlice/selectors'
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
    const filter = { tradeId: confirmedQuote.id, hopIndex: currentHopIndex }
    console.log('🎯 Created hop execution metadata filter:', filter)
    return filter
  }, [confirmedQuote?.id, currentHopIndex])

  const hopExecutionMetadata = useAppSelector(state => {
    const result = hopExecutionMetadataFilter
      ? selectHopExecutionMetadata(state, hopExecutionMetadataFilter)
      : undefined
    
    // Log when this changes
    if (typeof window !== 'undefined' && window.location.pathname.includes('/assets/')) {
      console.log('🔄 hopExecutionMetadata selector result:', {
        hopExecutionMetadataFilter,
        result,
        tradeExecution: state.tradeQuoteSlice?.tradeExecution,
        tradeExecutionForThisId: hopExecutionMetadataFilter?.tradeId ? 
          state.tradeQuoteSlice?.tradeExecution?.[hopExecutionMetadataFilter.tradeId] : 'no trade ID'
      })
    }
    
    return result
  })

  // Also watch current swap status for completion (more reliable than execution metadata)
  const currentSwap = useAppSelector(selectCurrentSwap)

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

  const [eventData, setEventData] = useState<ReturnType<typeof getMixpanelEventData>>(undefined)
  const trackMixpanelEvent = useMixpanel(eventData)
  const mixpanel = useMemo(() => getMixPanel(), [])

  const setErrorState = useCallback(
    (messageKey: string, amount: number) => {
      trackMixpanelEvent(MixPanelEvent.QuickBuyFailed)
      setQuickBuyState({ status: 'error', amount, messageKey })
      resetTrade()
    },
    [resetTrade, trackMixpanelEvent],
  )

  const setSuccessState = useCallback(
    (amount: number) => {
      console.log('🎉 QUICK BUY SUCCESS! Setting success state for amount:', amount)
      trackMixpanelEvent(MixPanelEvent.QuickBuySuccess)
      setQuickBuyState({ status: 'success', amount })
      resetTrade()

      clearSuccessTimer()
      successTimerRef.current = setTimeout(() => {
        console.log('⏰ Success timeout expired, resetting to idle')
        setQuickBuyState(currentState =>
          currentState.status === 'success' ? DEFAULT_STATE : currentState,
        )
      }, SUCCESS_TIMEOUT_MS)
    },
    [resetTrade, clearSuccessTimer, trackMixpanelEvent],
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

    console.log('🚀 Initializing Quick Buy trade with quote:', bestNoErrorQuote.quote)
    dispatch(tradeQuoteSlice.actions.initializeQuickBuyTrade(bestNoErrorQuote.quote))
    hasInitializedTradeRef.current = true

    console.log('📊 Capturing mixpanel event data for Quick Buy preview')
    const currentEventData = getMixpanelEventData()
    setEventData(currentEventData)
    console.log('📈 Quick Buy preview event data:', currentEventData)

    if (currentEventData && mixpanel) {
      console.log('📤 Tracking QuickBuyPreview event')
      mixpanel.track(MixPanelEvent.QuickBuyPreview, currentEventData)
    } else {
      console.log('⚠️ Could not track QuickBuyPreview - missing data or mixpanel:', { currentEventData: !!currentEventData, mixpanel: !!mixpanel })
    }
  }, [
    dispatch,
    quickBuyState.status,
    quickBuyState.amount,
    sortedTradeQuotes,
    setErrorState,
    mixpanel,
  ])

  useEffect(() => {
    console.log('🔍 QuickBuy execution effect triggered:', {
      quickBuyState: quickBuyState,
      hopExecutionMetadata: hopExecutionMetadata,
      confirmedQuote: confirmedQuote,
      hopExecutionMetadataFilter: hopExecutionMetadataFilter,
      currentSwap: currentSwap,
    })
    
    if (quickBuyState.status !== 'executing') {
      console.log('⏸️ Not executing, skipping checks')
      return
    }

    const swapState = hopExecutionMetadata?.swap.state
    const swapStatus = currentSwap?.status
    
    console.log('🔄 Swap state check:', {
      swapState,
      swapStatus,
      hopExecutionMetadata,
      swap: hopExecutionMetadata?.swap,
      currentSwap,
      SwapStatus: {
        Pending: SwapStatus.Pending,
        Success: SwapStatus.Success,
        Failed: SwapStatus.Failed,
      },
      TransactionExecutionState: {
        Failed: TransactionExecutionState.Failed,
        Complete: TransactionExecutionState.Complete,
      }
    })

    // Check for failure first
    if (swapState === TransactionExecutionState.Failed || swapStatus === SwapStatus.Failed) {
      console.log('❌ Setting error state via', swapState === TransactionExecutionState.Failed ? 'swapState' : 'swapStatus')
      setErrorState('quickBuy.error.failed', quickBuyState.amount ?? 0)
    } 
    // Check for success - prefer swap status as it's more reliable
    else if (swapStatus === SwapStatus.Success || swapState === TransactionExecutionState.Complete) {
      console.log('✅ Setting success state via', swapStatus === SwapStatus.Success ? 'swapStatus' : 'swapState')
      setSuccessState(quickBuyState.amount ?? 0)
    } else {
      console.log('⏳ Swap not yet complete:', { swapState, swapStatus })
    }
  }, [
    hopExecutionMetadata?.swap,
    currentSwap?.status, // Add currentSwap status as dependency
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
