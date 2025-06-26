import { createSelector } from '@reduxjs/toolkit'
import type { AssetId } from '@shapeshiftoss/caip'
import type {
  ProtocolFee,
  SupportedTradeQuoteStepIndex,
  TradeQuote,
  TradeRate,
} from '@shapeshiftoss/swapper'
import {
  getDefaultSlippageDecimalPercentageForSwapper,
  getHopByIndex,
  isAutoSlippageSupportedBySwapper,
  SwapperName,
} from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'
import { identity } from 'lodash'
import type { Selector } from 'reselect'

import { selectWalletConnectedChainIds } from '../common-selectors'
import {
  selectMarketDataUserCurrency,
  selectUserCurrencyToUsdRate,
} from '../marketDataSlice/selectors'
import { preferences } from '../preferencesSlice/preferencesSlice'
import { tradeQuoteSlice } from '../tradeQuoteSlice/tradeQuoteSlice'
import { SWAPPER_USER_ERRORS } from './constants'
import type { ActiveQuoteMeta } from './types'

import { bn, bnOrZero } from '@/lib/bignumber/bignumber'
import { calculateFeeUsd } from '@/lib/fees/utils'
import { fromBaseUnit } from '@/lib/math'
import { validateQuoteRequest } from '@/state/apis/swapper/helpers/validateQuoteRequest'
import {
  QueryStatusExtended,
  selectIsTradeQuoteApiQueryPending,
  selectTradeQuoteSwapperToQueryStatus,
} from '@/state/apis/swapper/selectors'
import type { ApiQuote, ErrorWithMeta, TradeQuoteError } from '@/state/apis/swapper/types'
import { TradeQuoteRequestError, TradeQuoteWarning } from '@/state/apis/swapper/types'
import { getEnabledSwappers } from '@/state/helpers'
import type { ReduxState } from '@/state/reducer'
import { createDeepEqualOutputSelector } from '@/state/selector-utils'
import {
  selectHopIndexParamFromRequiredFilter,
  selectTradeIdParamFromRequiredFilter,
} from '@/state/selectors'
import { selectFeeAssetById } from '@/state/slices/assetsSlice/selectors'
import { portfolio } from '@/state/slices/portfolioSlice/portfolioSlice'
import {
  selectFirstHopSellAccountId,
  selectHasUserEnteredAmount,
  selectInputBuyAsset,
  selectInputBuyAssetUserCurrencyRate,
  selectInputSellAmountCryptoBaseUnit,
  selectInputSellAsset,
  selectInputSellAssetUsdRate,
  selectInputSellAssetUserCurrencyRate,
  selectManualReceiveAddress,
  selectSecondHopSellAccountId,
  selectSellAssetBalanceCryptoBaseUnit,
  selectUserSlippagePercentageDecimal,
} from '@/state/slices/tradeInputSlice/selectors'
import {
  getActiveQuoteMetaOrDefault,
  getBuyAmountAfterFeesCryptoPrecision,
  getHopTotalNetworkFeeUserCurrency,
  getTotalProtocolFeeByAsset,
  sortTradeQuotes,
} from '@/state/slices/tradeQuoteSlice/helpers'

export const selectActiveQuoteMeta: Selector<ReduxState, ActiveQuoteMeta | undefined> =
  createSelector(tradeQuoteSlice.selectSlice, tradeQuoteSlice => tradeQuoteSlice.activeQuoteMeta)

export const selectLastRefreshTime: Selector<ReduxState, number> = createSelector(
  tradeQuoteSlice.selectSlice,
  tradeQuoteSlice => tradeQuoteSlice.lastRefreshTime,
)

export const selectIsRefreshPending: Selector<ReduxState, boolean> = createSelector(
  tradeQuoteSlice.selectSlice,
  tradeQuoteSlice => tradeQuoteSlice.isRefreshPending,
)

const selectTradeQuotes = createDeepEqualOutputSelector(
  tradeQuoteSlice.selectSlice,
  tradeQuoteSlice => tradeQuoteSlice.tradeQuotes,
)

const selectEnabledSwappersIgnoringCrossAccountTrade = createSelector(
  preferences.selectors.selectFeatureFlags,
  featureFlags => {
    // cross account trade logic is irrelevant here, so we can set the flags to false here
    const enabledSwappers = getEnabledSwappers(featureFlags, false, false)
    return Object.values(SwapperName).filter(
      swapperName => enabledSwappers[swapperName],
    ) as SwapperName[]
  },
)

// Returns a mapping from swapper name to a flag indicating whether a trade quote response is
// available.
export const selectIsSwapperResponseAvailable = createDeepEqualOutputSelector(
  selectTradeQuotes,
  selectEnabledSwappersIgnoringCrossAccountTrade,
  (tradeQuotes, enabledSwappers) => {
    return enabledSwappers.reduce(
      (acc, swapperName) => {
        const swapperResponse = tradeQuotes[swapperName]
        acc[swapperName] = swapperResponse !== undefined
        return acc
      },
      {} as Record<SwapperName, boolean>,
    )
  },
)

// Returns a mapping from swapper name to a flag indicating whether an actual trade quote is
// available on the trade quote response.
const selectIsSwapperQuoteAvailable = createSelector(
  selectTradeQuotes,
  selectEnabledSwappersIgnoringCrossAccountTrade,
  (tradeQuotes, enabledSwappers) => {
    return enabledSwappers.reduce(
      (acc, swapperName) => {
        const swapperResponse = tradeQuotes[swapperName]
        acc[swapperName] =
          swapperResponse !== undefined &&
          Object.values(swapperResponse).some(swapperQuote => swapperQuote.quote !== undefined)
        return acc
      },
      {} as Record<SwapperName, boolean>,
    )
  },
)

export const selectIsAnySwapperQuoteAvailable = createSelector(
  selectIsSwapperQuoteAvailable,
  isSwapperQuoteAvailable => {
    return Object.values(isSwapperQuoteAvailable).some(identity)
  },
)

// Returns the top-level errors related to the request for a trade quote. Not related to individual
// quote responses.
export const selectTradeQuoteRequestErrors = createDeepEqualOutputSelector(
  selectInputSellAmountCryptoBaseUnit,
  portfolio.selectors.selectIsWalletConnected,
  selectWalletConnectedChainIds,
  selectManualReceiveAddress,
  selectSellAssetBalanceCryptoBaseUnit,
  selectInputSellAsset,
  selectInputBuyAsset,
  (
    inputSellAmountCryptoBaseUnit,
    isWalletConnected,
    walletConnectedChainIds,
    manualReceiveAddress,
    sellAssetBalanceCryptoBaseUnit,
    sellAsset,
    buyAsset,
  ) => {
    const hasUserEnteredAmount = bnOrZero(inputSellAmountCryptoBaseUnit).gt(0)
    if (!hasUserEnteredAmount) return []

    const topLevelValidationErrors = validateQuoteRequest({
      isWalletConnected,
      walletConnectedChainIds,
      manualReceiveAddress,
      sellAssetBalanceCryptoBaseUnit,
      sellAmountCryptoBaseUnit: inputSellAmountCryptoBaseUnit,
      sellAsset,
      buyAsset,
    })

    return topLevelValidationErrors
  },
)

// Returns the top-level errors related to the response from the trade quote request. Not related to
// individual quote responses.
export const selectTradeQuoteResponseErrors = createDeepEqualOutputSelector(
  selectInputSellAmountCryptoBaseUnit,
  selectTradeQuotes,
  selectEnabledSwappersIgnoringCrossAccountTrade,
  (inputSellAmountCryptoBaseUnit, swappersApiTradeQuotes, enabledSwappers) => {
    const hasUserEnteredAmount = bnOrZero(inputSellAmountCryptoBaseUnit).gt(0)
    if (!hasUserEnteredAmount) return []

    const numSwappers = enabledSwappers.length

    // don't report NoQuotesAvailable if any swapper has not upserted a response
    if (Object.values(swappersApiTradeQuotes).length < numSwappers) {
      return []
    }

    // if every quote response is empty, no quotes are available
    if (Object.values(swappersApiTradeQuotes).every(quotes => Object.keys(quotes).length === 0)) {
      return [{ error: TradeQuoteRequestError.NoQuotesAvailable }]
    } else {
      return []
    }
  },
)

export const selectSortedTradeQuotes = createDeepEqualOutputSelector(
  [selectTradeQuotes, tradeQuoteSlice.selectors.selectQuoteSortOption],
  (tradeQuotes, sortOption) => {
    const result = sortTradeQuotes(tradeQuotes, sortOption)
    return result
  },
)

const selectConfirmedQuote: Selector<ReduxState, TradeQuote | TradeRate | undefined> =
  createDeepEqualOutputSelector(tradeQuoteSlice.selectSlice, tradeQuoteState => {
    return tradeQuoteState.confirmedQuote
  })

export const selectActiveQuoteMetaOrDefault: Selector<
  ReduxState,
  { swapperName: SwapperName; identifier: string } | undefined
> = createSelector(selectActiveQuoteMeta, selectSortedTradeQuotes, getActiveQuoteMetaOrDefault)

export const selectActiveSwapperName: Selector<ReduxState, SwapperName | undefined> =
  createSelector(
    selectActiveQuoteMetaOrDefault,
    selectTradeQuotes,
    (activeQuoteMetaOrDefault, tradeQuotes) => {
      if (activeQuoteMetaOrDefault === undefined) return
      // need to ensure a quote exists for the selection
      if (
        tradeQuotes[activeQuoteMetaOrDefault.swapperName]?.[activeQuoteMetaOrDefault.identifier]
      ) {
        return activeQuoteMetaOrDefault.swapperName
      }
    },
  )

export const selectActiveSwapperApiResponse: Selector<ReduxState, ApiQuote | undefined> =
  createDeepEqualOutputSelector(
    selectTradeQuotes,
    selectActiveQuoteMetaOrDefault,
    (tradeQuotes, activeQuoteMeta) => {
      // If the active quote was reset, we do NOT want to return a stale quote as an "active" quote
      if (activeQuoteMeta === undefined) return undefined

      return tradeQuotes[activeQuoteMeta.swapperName]?.[activeQuoteMeta.identifier]
    },
  )

export const selectActiveQuote: Selector<ReduxState, TradeQuote | TradeRate | undefined> =
  createDeepEqualOutputSelector(
    selectActiveSwapperApiResponse,
    selectConfirmedQuote,
    (response, confirmedQuote) => {
      // Return the confirmed quote for trading, if it exists.
      // This prevents the quote changing during trade execution, but has implications on the UI
      // displaying stale data. To prevent displaying stale data, we must ensure to clear the
      // confirmedQuote when not executing a trade.
      if (confirmedQuote) return confirmedQuote
      return response?.quote
    },
  )

const selectQuoteSlippageTolerancePercentageDecimal: Selector<ReduxState, string | undefined> =
  createSelector(selectActiveQuote, activeQuote => {
    return activeQuote?.slippageTolerancePercentageDecimal
  })

export const selectQuoteSlippageTolerancePercentage: Selector<ReduxState, string | undefined> =
  createSelector(
    selectQuoteSlippageTolerancePercentageDecimal,
    slippageTolerancePercentageDecimal => {
      return slippageTolerancePercentageDecimal
        ? bn(slippageTolerancePercentageDecimal).times(100).toString()
        : undefined
    },
  )

export const selectConfirmedQuoteTradeId: Selector<ReduxState, string | undefined> = createSelector(
  selectConfirmedQuote,
  confirmedQuote => confirmedQuote?.id,
)

export const selectActiveQuoteErrors: Selector<
  ReduxState,
  ErrorWithMeta<TradeQuoteError>[] | undefined
> = createDeepEqualOutputSelector(selectActiveSwapperApiResponse, response => response?.errors)

export const selectActiveQuoteWarnings: Selector<
  ReduxState,
  ErrorWithMeta<TradeQuoteWarning>[] | undefined
> = createDeepEqualOutputSelector(selectActiveSwapperApiResponse, response => response?.warnings)

export const selectBuyAmountAfterFeesCryptoPrecision: Selector<ReduxState, string | undefined> =
  createSelector(selectActiveQuote, selectActiveSwapperName, quote =>
    quote ? getBuyAmountAfterFeesCryptoPrecision({ quote }) : undefined,
  )

export const selectTotalProtocolFeeByAsset: Selector<
  ReduxState,
  Record<AssetId, ProtocolFee> | undefined
> = createDeepEqualOutputSelector(selectActiveQuote, quote =>
  quote ? getTotalProtocolFeeByAsset(quote) : undefined,
)

export const selectIsActiveQuoteMultiHop: Selector<ReduxState, boolean | undefined> =
  createSelector(selectActiveQuote, quote => (quote ? quote?.steps.length > 1 : undefined))

export const selectFirstHop: Selector<ReduxState, TradeQuote['steps'][0] | undefined> =
  createDeepEqualOutputSelector(selectActiveQuote, quote => getHopByIndex(quote, 0))

export const selectLastHop: Selector<
  ReduxState,
  TradeQuote['steps'][SupportedTradeQuoteStepIndex] | undefined
> = createDeepEqualOutputSelector(selectActiveQuote, quote => {
  if (!quote) return
  const stepIndex = (quote.steps.length - 1) as SupportedTradeQuoteStepIndex
  return getHopByIndex(quote, stepIndex)
})

// selects the second hop if it exists. This is different to "last hop"
export const selectSecondHop: Selector<ReduxState, TradeQuote['steps'][1] | undefined> =
  createDeepEqualOutputSelector(selectActiveQuote, quote => getHopByIndex(quote, 1))

export const selectFirstHopSellAsset: Selector<ReduxState, Asset | undefined> =
  createDeepEqualOutputSelector(selectFirstHop, firstHop =>
    firstHop ? firstHop.sellAsset : undefined,
  )

export const selectSecondHopSellAsset: Selector<ReduxState, Asset | undefined> =
  createDeepEqualOutputSelector(selectSecondHop, secondHop =>
    secondHop ? secondHop.sellAsset : undefined,
  )

export const selectLastHopBuyAsset: Selector<ReduxState, Asset | undefined> =
  createDeepEqualOutputSelector(selectLastHop, lastHop => (lastHop ? lastHop.buyAsset : undefined))

export const selectQuoteSellAmountCryptoBaseUnit: Selector<ReduxState, string | undefined> =
  createSelector(selectFirstHop, firstHop =>
    firstHop ? firstHop.sellAmountIncludingProtocolFeesCryptoBaseUnit : undefined,
  )

export const selectIsUnsafeActiveQuote: Selector<ReduxState, boolean> = createSelector(
  selectActiveQuoteWarnings,
  activeQuoteWarnings => {
    return !!activeQuoteWarnings?.some(({ error }) => error === TradeQuoteWarning.UnsafeQuote)
  },
)

export const selectQuoteSellAmountCryptoPrecision: Selector<ReduxState, string | undefined> =
  createSelector(
    selectFirstHopSellAsset,
    selectQuoteSellAmountCryptoBaseUnit,
    (firstHopSellAsset, sellAmountCryptoBaseUnit) =>
      firstHopSellAsset
        ? fromBaseUnit(bnOrZero(sellAmountCryptoBaseUnit), firstHopSellAsset?.precision)
        : undefined,
  )

export const selectFirstHopSellFeeAsset: Selector<ReduxState, Asset | undefined> =
  createDeepEqualOutputSelector(
    (state: ReduxState) => selectFeeAssetById(state, selectFirstHopSellAsset(state)?.assetId ?? ''),
    firstHopSellFeeAsset => firstHopSellFeeAsset,
  )

export const selectSecondHopSellFeeAsset: Selector<ReduxState, Asset | undefined> =
  createDeepEqualOutputSelector(
    (state: ReduxState) =>
      selectFeeAssetById(state, selectSecondHopSellAsset(state)?.assetId ?? ''),
    secondHopSellFeeAsset => secondHopSellFeeAsset,
  )

export const selectFirstHopNetworkFeeCryptoBaseUnit: Selector<ReduxState, string | undefined> =
  createSelector(selectFirstHop, firstHop => firstHop?.feeData.networkFeeCryptoBaseUnit)

export const selectSecondHopNetworkFeeCryptoBaseUnit: Selector<ReduxState, string | undefined> =
  createSelector(selectSecondHop, secondHop => secondHop?.feeData.networkFeeCryptoBaseUnit)

export const selectFirstHopNetworkFeeUserCurrency: Selector<ReduxState, string | undefined> =
  createSelector(
    selectFirstHop,
    selectFirstHopSellFeeAsset,
    selectMarketDataUserCurrency,
    (tradeQuoteStep, feeAsset, marketData) => {
      if (!tradeQuoteStep) return

      if (feeAsset === undefined) {
        throw Error(`missing fee asset for assetId ${tradeQuoteStep.sellAsset.assetId}`)
      }

      const getFeeAssetUserCurrencyRate = () => {
        return marketData[feeAsset?.assetId ?? '']?.price ?? '0'
      }

      return getHopTotalNetworkFeeUserCurrency(
        tradeQuoteStep.feeData.networkFeeCryptoBaseUnit,
        feeAsset,
        getFeeAssetUserCurrencyRate,
      )?.toString()
    },
  )

export const selectSecondHopNetworkFeeUserCurrency: Selector<ReduxState, string | undefined> =
  createSelector(
    selectSecondHop,
    selectSecondHopSellFeeAsset,
    selectMarketDataUserCurrency,
    (tradeQuoteStep, feeAsset, marketData) => {
      if (!tradeQuoteStep) return

      if (feeAsset === undefined) {
        throw Error(`missing fee asset for assetId ${tradeQuoteStep.sellAsset.assetId}`)
      }
      const getFeeAssetUserCurrencyRate = () => {
        return marketData[feeAsset?.assetId ?? '']?.price ?? '0'
      }

      return getHopTotalNetworkFeeUserCurrency(
        tradeQuoteStep.feeData.networkFeeCryptoBaseUnit,
        feeAsset,
        getFeeAssetUserCurrencyRate,
      )?.toString()
    },
  )

export const selectTotalNetworkFeeUserCurrency: Selector<ReduxState, string | undefined> =
  createSelector(
    selectFirstHopNetworkFeeUserCurrency,
    selectSecondHopNetworkFeeUserCurrency,
    (firstHopNetworkFeeUserCurrency, secondHopNetworkFeeUserCurrency) => {
      if (
        firstHopNetworkFeeUserCurrency === undefined &&
        secondHopNetworkFeeUserCurrency === undefined
      )
        return

      return bnOrZero(firstHopNetworkFeeUserCurrency)
        .plus(secondHopNetworkFeeUserCurrency ?? 0)
        .toString()
    },
  )

export const selectDefaultSlippagePercentage: Selector<ReduxState, string | undefined> =
  createSelector(selectActiveSwapperName, activeSwapperName => {
    if (!activeSwapperName) return undefined
    // Auto-slippage means we do not have, nor do we ever want to have a default
    if (isAutoSlippageSupportedBySwapper(activeSwapperName)) return undefined
    return bn(getDefaultSlippageDecimalPercentageForSwapper(activeSwapperName))
      .times(100)
      .toString()
  })

// Returns the trade slippage in priority order: user preference, quote derived, default
export const selectTradeSlippagePercentageDecimal: Selector<ReduxState, string> = createSelector(
  selectActiveSwapperName,
  selectQuoteSlippageTolerancePercentageDecimal,
  selectUserSlippagePercentageDecimal,
  (activeSwapperName, quoteSlippageTolerancePercentage, slippagePreferencePercentage) => {
    return (
      slippagePreferencePercentage ??
      quoteSlippageTolerancePercentage ??
      getDefaultSlippageDecimalPercentageForSwapper(activeSwapperName)
    )
  },
)

export const selectQuoteSellAmountIncludingProtocolFeesCryptoBaseUnit = createSelector(
  selectFirstHop,
  firstHop => firstHop?.sellAmountIncludingProtocolFeesCryptoBaseUnit,
)

export const selectBuyAmountBeforeFeesCryptoBaseUnit = createSelector(
  selectLastHop,
  lastHop => lastHop?.buyAmountBeforeFeesCryptoBaseUnit,
)

export const selectQuoteSellAmountBeforeFeesCryptoPrecision = createSelector(
  selectQuoteSellAmountIncludingProtocolFeesCryptoBaseUnit,
  selectFirstHopSellAsset,
  (sellAmountBeforeFeesCryptoBaseUnit, sellAsset) => {
    if (!sellAmountBeforeFeesCryptoBaseUnit || !sellAsset) return
    return fromBaseUnit(sellAmountBeforeFeesCryptoBaseUnit, sellAsset.precision)
  },
)

export const selectBuyAmountBeforeFeesCryptoPrecision = createSelector(
  selectBuyAmountBeforeFeesCryptoBaseUnit,
  selectLastHopBuyAsset,
  (buyAmountBeforeFeesCryptoBaseUnit, buyAsset) => {
    if (!buyAmountBeforeFeesCryptoBaseUnit || !buyAsset) return
    return fromBaseUnit(buyAmountBeforeFeesCryptoBaseUnit, buyAsset.precision)
  },
)

export const selectBuyAmountAfterFeesUserCurrency = createSelector(
  selectBuyAmountAfterFeesCryptoPrecision,
  selectInputBuyAssetUserCurrencyRate,
  (buyAmountCryptoPrecision, buyAssetUserCurrencyRate) => {
    if (!buyAmountCryptoPrecision || !buyAssetUserCurrencyRate) return
    return bn(buyAmountCryptoPrecision).times(buyAssetUserCurrencyRate).toFixed()
  },
)

export const selectQuoteSellAmountUsd = createSelector(
  selectQuoteSellAmountCryptoPrecision,
  selectInputSellAssetUsdRate,
  (sellAmountCryptoPrecision, sellAssetUsdRate) => {
    if (!sellAmountCryptoPrecision || !sellAssetUsdRate) return
    return bn(sellAmountCryptoPrecision).times(sellAssetUsdRate).toFixed()
  },
)

export const selectQuoteSellAmountUserCurrency = createSelector(
  selectQuoteSellAmountCryptoPrecision,
  selectInputSellAssetUserCurrencyRate,
  (sellAmountCryptoPrecision, sellAssetUserCurrencyRate) => {
    if (!sellAmountCryptoPrecision || !sellAssetUserCurrencyRate) return
    return bn(sellAmountCryptoPrecision).times(sellAssetUserCurrencyRate).toFixed()
  },
)

export const selectActiveQuoteAffiliateBps: Selector<ReduxState, string> = createSelector(
  selectActiveQuote,
  activeQuote => {
    if (!activeQuote) return '0'
    return activeQuote.affiliateBps
  },
)

export const selectTradeAffiliateFeeUsd = createSelector(
  selectQuoteSellAmountUsd,
  selectActiveQuoteAffiliateBps,
  (sellAmountUsd, affiliateBps) => {
    const { feeUsd } = calculateFeeUsd({
      inputAmountUsd: bnOrZero(sellAmountUsd),
    })

    if (!affiliateBps) return
    if (affiliateBps === '0') return bn(0)

    return feeUsd
  },
)

export const selectTradeQuoteAffiliateFeeAfterDiscountUserCurrency = createSelector(
  selectTradeAffiliateFeeUsd,
  selectUserCurrencyToUsdRate,
  (tradeAffiliateFeeUsd, sellUserCurrencyRate) => {
    if (!tradeAffiliateFeeUsd || !sellUserCurrencyRate) return
    return bn(tradeAffiliateFeeUsd).times(sellUserCurrencyRate).toFixed()
  },
)

export const selectConfirmedTradeExecution = createSelector(
  tradeQuoteSlice.selectSlice,
  selectConfirmedQuoteTradeId,
  (swappers, confirmedTradeId) => {
    if (!confirmedTradeId) return
    return swappers.tradeExecution[confirmedTradeId]
  },
)

export const selectConfirmedTradeExecutionState = createSelector(
  tradeQuoteSlice.selectSlice,
  selectConfirmedQuoteTradeId,
  (swappers, confirmedTradeId) => {
    if (!confirmedTradeId) return
    return swappers.tradeExecution[confirmedTradeId].state
  },
)

// selects the account ID we're selling from for the given hop
export const selectHopSellAccountId = createSelector(
  selectFirstHopSellAccountId,
  selectSecondHopSellAccountId,
  selectHopIndexParamFromRequiredFilter,
  (firstHopSellAccountId, secondHopSellAccountId, hopIndex) => {
    return hopIndex === 0 ? firstHopSellAccountId : secondHopSellAccountId
  },
)

export const selectHopExecutionMetadata = createDeepEqualOutputSelector(
  tradeQuoteSlice.selectSlice,
  selectTradeIdParamFromRequiredFilter,
  selectHopIndexParamFromRequiredFilter,
  (swappers, tradeId, hopIndex) => {
    return hopIndex === 0
      ? swappers.tradeExecution[tradeId]?.firstHop
      : swappers.tradeExecution[tradeId]?.secondHop
  },
)

export const selectTradeQuoteDisplayCache = createDeepEqualOutputSelector(
  tradeQuoteSlice.selectSlice,
  tradeQuoteSlice => tradeQuoteSlice.tradeQuoteDisplayCache,
)

export const selectIsTradeQuoteRequestAborted = createSelector(
  tradeQuoteSlice.selectSlice,
  swappers => swappers.isTradeQuoteRequestAborted,
)

export const selectLoadingSwappers = createSelector(
  selectIsTradeQuoteApiQueryPending,
  selectTradeQuoteDisplayCache,
  (isTradeQuoteApiQueryPending, tradeQuoteDisplayCache) => {
    return Object.entries(isTradeQuoteApiQueryPending)
      .filter(([swapperName, isPending]) => {
        // filter out entries that already have data - these have been loaded and are refetching
        const hasDisplayCache = tradeQuoteDisplayCache.some(
          quoteData => quoteData.swapperName === swapperName,
        )

        return isPending && !hasDisplayCache
      })
      .map(([swapperName, _isQuoteAvailable]) => swapperName)
  },
)

export const selectUserAvailableTradeQuotes = createSelector(
  selectTradeQuoteDisplayCache,
  tradeQuoteDisplayCache => {
    return tradeQuoteDisplayCache.filter(
      quoteData =>
        SWAPPER_USER_ERRORS.includes(quoteData.errors[0]?.error) || !quoteData.errors.length,
    )
  },
)

export const selectUserUnavailableTradeQuotes = createSelector(
  selectTradeQuoteDisplayCache,
  tradeQuoteDisplayCache => {
    return tradeQuoteDisplayCache.filter(
      quoteData =>
        quoteData.errors.length && !SWAPPER_USER_ERRORS.includes(quoteData.errors[0]?.error),
    )
  },
)

export const selectIsAnyTradeQuoteLoading = createSelector(
  selectLoadingSwappers,
  selectHasUserEnteredAmount,
  (loadingSwappers, hasUserEnteredAmount) => {
    return hasUserEnteredAmount && loadingSwappers.length > 0
  },
)

export const selectIsFirstQuoteLoading = createSelector(
  selectTradeQuoteSwapperToQueryStatus,
  swapperToQueryStatus => {
    return !Object.values(swapperToQueryStatus).some(
      queryStatus => queryStatus === QueryStatusExtended.fulfilledWithQuote,
    )
  },
)

export const selectIsActiveSwapperQuoteLoading = createSelector(
  selectIsTradeQuoteApiQueryPending,
  selectActiveSwapperName,
  (isTradeQuoteApiQueryPending, activeSwapperName) => {
    return activeSwapperName && isTradeQuoteApiQueryPending[activeSwapperName]
  },
)

export const selectShouldShowTradeQuoteOrAwaitInput = createSelector(
  selectHasUserEnteredAmount,
  selectIsAnyTradeQuoteLoading,
  selectIsAnySwapperQuoteAvailable,
  (hasUserEnteredAmount, isAnyTradeQuoteLoading, isAnySwapperQuoteAvailable) => {
    // Paranoia - if no amount entered, we're still awaiting input
    if (!hasUserEnteredAmount) {
      return true
    }

    // If we're still loading, return true if there is any quote available
    if (isAnyTradeQuoteLoading) {
      return isAnySwapperQuoteAvailable
    }

    // Otherwise, the quotes are fully loaded and ready to display, or we have an empty result which
    // should default to true to allow the app to stop loading state.
    return true
  },
)
