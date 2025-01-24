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
import type { Selector } from 'reselect'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { ShapeshiftFeeMetadata } from 'lib/fees/model'
import { fromBaseUnit } from 'lib/math'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import {
  selectHopIndexParamFromRequiredFilter,
  selectTradeIdParamFromRequiredFilter,
} from 'state/selectors'
import { selectFeeAssetById } from 'state/slices/assetsSlice/selectors'
import {
  selectFirstHopSellAccountId,
  selectInputBuyAssetUserCurrencyRate,
  selectInputSellAssetUsdRate,
  selectInputSellAssetUserCurrencyRate,
  selectSecondHopSellAccountId,
  selectUserSlippagePercentageDecimal,
} from 'state/slices/tradeInputSlice/selectors'
import {
  getBuyAmountAfterFeesCryptoPrecision,
  getHopTotalNetworkFeeUserCurrency,
  getHopTotalProtocolFeesFiatPrecision,
  getTotalProtocolFeeByAsset,
} from 'state/slices/tradeQuoteSlice/helpers'

import {
  selectMarketDataUsd,
  selectMarketDataUserCurrency,
  selectUserCurrencyToUsdRate,
} from '../marketDataSlice/selectors'
import type { ActiveQuoteMeta } from '../tradeQuoteSlice/types'

const selectExecutionSlice = (state: ReduxState) => state.tradeExecution

export const selectConfirmedQuote: Selector<ReduxState, TradeQuote | TradeRate | undefined> =
  createDeepEqualOutputSelector(selectExecutionSlice, tradeQuoteState => {
    return tradeQuoteState.confirmedQuote?.quote
  })

export const selectConfirmedQuoteMetadata: Selector<ReduxState, ActiveQuoteMeta | undefined> =
  createDeepEqualOutputSelector(selectExecutionSlice, tradeQuoteState => {
    return tradeQuoteState.confirmedQuote?.metadata
  })

// This is NOT safe to calculate at read time because the fox balances are changing underneath us as
// the trade is executed. Instead, this must be set when confirming the quote before executing the
// trade.
export const selectShapeshiftFeeMetadata: Selector<ReduxState, ShapeshiftFeeMetadata | undefined> =
  createDeepEqualOutputSelector(selectExecutionSlice, tradeQuoteState => {
    return tradeQuoteState.confirmedQuote?.shapeshiftFeeMetadata
  })

export const selectConfirmedSwapperName: Selector<ReduxState, SwapperName | undefined> =
  createSelector(selectConfirmedQuoteMetadata, confirmedQuoteMetadata => {
    return confirmedQuoteMetadata?.swapperName
  })

const selectQuoteSlippageTolerancePercentageDecimal: Selector<ReduxState, string | undefined> =
  createSelector(selectConfirmedQuote, confirmedQuote => {
    return confirmedQuote?.slippageTolerancePercentageDecimal
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

export const selectHopTotalProtocolFeesFiatPrecision: Selector<ReduxState, string | undefined> =
  createSelector(
    selectConfirmedQuote,
    selectUserCurrencyToUsdRate,
    selectMarketDataUsd,
    (_state: ReduxState, stepIndex: SupportedTradeQuoteStepIndex) => stepIndex,
    (quote, userCurrencyToUsdRate, marketDataUsd, stepIndex) => {
      const step = getHopByIndex(quote, stepIndex)
      if (!step) return

      return getHopTotalProtocolFeesFiatPrecision(step, userCurrencyToUsdRate, marketDataUsd)
    },
  )

export const selectBuyAmountAfterFeesCryptoPrecision: Selector<ReduxState, string | undefined> =
  createSelector(selectConfirmedQuote, confirmedQuote =>
    confirmedQuote ? getBuyAmountAfterFeesCryptoPrecision({ quote: confirmedQuote }) : undefined,
  )

export const selectTotalProtocolFeeByAsset: Selector<
  ReduxState,
  Record<AssetId, ProtocolFee> | undefined
> = createDeepEqualOutputSelector(selectConfirmedQuote, confirmedQuote =>
  confirmedQuote ? getTotalProtocolFeeByAsset(confirmedQuote) : undefined,
)

export const selectIsActiveQuoteMultiHop: Selector<ReduxState, boolean | undefined> =
  createSelector(selectConfirmedQuote, confirmedQuote =>
    confirmedQuote ? confirmedQuote.steps.length > 1 : undefined,
  )

export const selectFirstHop: Selector<ReduxState, TradeQuote['steps'][0] | undefined> =
  createDeepEqualOutputSelector(selectConfirmedQuote, confirmedQuote =>
    confirmedQuote ? getHopByIndex(confirmedQuote, 0) : undefined,
  )

export const selectLastHop: Selector<
  ReduxState,
  TradeQuote['steps'][SupportedTradeQuoteStepIndex] | undefined
> = createDeepEqualOutputSelector(selectConfirmedQuote, confirmedQuote => {
  if (!confirmedQuote) return
  const stepIndex = (confirmedQuote?.steps.length - 1) as SupportedTradeQuoteStepIndex
  return getHopByIndex(confirmedQuote, stepIndex)
})

// selects the second hop if it exists. This is different to "last hop"
export const selectSecondHop: Selector<ReduxState, TradeQuote['steps'][1] | undefined> =
  createDeepEqualOutputSelector(selectConfirmedQuote, confirmedQuote =>
    confirmedQuote ? getHopByIndex(confirmedQuote, 1) : undefined,
  )

export const selectFirstHopSellAsset: Selector<ReduxState, Asset | undefined> =
  createDeepEqualOutputSelector(selectFirstHop, firstHop =>
    firstHop ? firstHop.sellAsset : undefined,
  )

export const selectSecondHopSellAsset: Selector<ReduxState, Asset | undefined> =
  createDeepEqualOutputSelector(selectSecondHop, secondHop =>
    secondHop ? secondHop.sellAsset : undefined,
  )

// last hop !== second hop for single hop trades. Used to handling end-state of trades
export const selectLastHopSellAsset: Selector<ReduxState, Asset | undefined> =
  createDeepEqualOutputSelector(selectLastHop, lastHop => (lastHop ? lastHop.sellAsset : undefined))

export const selectLastHopBuyAsset: Selector<ReduxState, Asset | undefined> =
  createDeepEqualOutputSelector(selectLastHop, lastHop => (lastHop ? lastHop.buyAsset : undefined))

export const selectQuoteSellAmountCryptoBaseUnit: Selector<ReduxState, string | undefined> =
  createSelector(selectFirstHop, firstHop =>
    firstHop ? firstHop.sellAmountIncludingProtocolFeesCryptoBaseUnit : undefined,
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

export const selectLastHopSellFeeAsset: Selector<ReduxState, Asset | undefined> =
  createDeepEqualOutputSelector(
    (state: ReduxState) => selectFeeAssetById(state, selectLastHopSellAsset(state)?.assetId ?? ''),
    lastHopSellFeeAsset => lastHopSellFeeAsset,
  )

export const selectNetworkFeeRequiresBalance: Selector<ReduxState, boolean> = createSelector(
  selectConfirmedSwapperName,
  swapperName => swapperName !== SwapperName.CowSwap,
)

export const selectFirstHopNetworkFeeCryptoBaseUnit: Selector<ReduxState, string | undefined> =
  createSelector(selectFirstHop, firstHop => firstHop?.feeData.networkFeeCryptoBaseUnit)

export const selectSecondHopNetworkFeeCryptoBaseUnit: Selector<ReduxState, string | undefined> =
  createSelector(selectSecondHop, secondHop => secondHop?.feeData.networkFeeCryptoBaseUnit)

export const selectLastHopNetworkFeeCryptoBaseUnit: Selector<ReduxState, string | undefined> =
  createSelector(selectLastHop, lastHop => lastHop?.feeData.networkFeeCryptoBaseUnit)

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

export const selectHopNetworkFeeUserCurrency = createDeepEqualOutputSelector(
  selectFirstHopNetworkFeeUserCurrency,
  selectSecondHopNetworkFeeUserCurrency,
  selectHopIndexParamFromRequiredFilter,
  (firstHopNetworkFeeUserCurrency, secondHopNetworkFeeUserCurrency, hopIndex) => {
    return hopIndex === 0 ? firstHopNetworkFeeUserCurrency : secondHopNetworkFeeUserCurrency
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
  createSelector(selectConfirmedSwapperName, activeSwapperName => {
    if (!activeSwapperName) return undefined
    // Auto-slippage means we do not have, nor do we ever want to have a default
    if (isAutoSlippageSupportedBySwapper(activeSwapperName)) return undefined
    return bn(getDefaultSlippageDecimalPercentageForSwapper(activeSwapperName))
      .times(100)
      .toString()
  })

// Returns the trade slippage in priority order: user preference, quote derived, default
export const selectTradeSlippagePercentageDecimal: Selector<ReduxState, string> = createSelector(
  selectConfirmedSwapperName,
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

export const selectActiveQuoteAffiliateBps: Selector<ReduxState, string | undefined> =
  createSelector(selectConfirmedQuote, confirmedQuote => {
    if (!confirmedQuote) return
    return confirmedQuote.affiliateBps
  })

export const selectTradeQuoteAffiliateFeeAfterDiscountUsd = createSelector(
  selectShapeshiftFeeMetadata,
  selectActiveQuoteAffiliateBps,
  (confirmedShapeshiftFeeMetadata, affiliateBps) => {
    if (!affiliateBps || !confirmedShapeshiftFeeMetadata) return
    if (affiliateBps === '0') return bn(0)

    return confirmedShapeshiftFeeMetadata.feeUsd
  },
)

export const selectTradeQuoteAffiliateFeeDiscountUsd = createSelector(
  selectShapeshiftFeeMetadata,
  confirmedShapeshiftFeeMetadata => {
    if (!confirmedShapeshiftFeeMetadata) return
    return confirmedShapeshiftFeeMetadata.foxDiscountUsd
  },
)

export const selectTradeQuoteAffiliateFeeAfterDiscountUserCurrency = createSelector(
  selectTradeQuoteAffiliateFeeAfterDiscountUsd,
  selectUserCurrencyToUsdRate,
  (tradeAffiliateFeeAfterDiscountUsd, sellUserCurrencyRate) => {
    if (!tradeAffiliateFeeAfterDiscountUsd || !sellUserCurrencyRate) return
    return bn(tradeAffiliateFeeAfterDiscountUsd).times(sellUserCurrencyRate).toFixed()
  },
)

export const selectTradeQuoteAffiliateFeeDiscountUserCurrency = createSelector(
  selectTradeQuoteAffiliateFeeDiscountUsd,
  selectUserCurrencyToUsdRate,
  (tradeAffiliateFeeDiscountUsd, sellUserCurrencyRate) => {
    if (!tradeAffiliateFeeDiscountUsd || !sellUserCurrencyRate) return
    return bn(tradeAffiliateFeeDiscountUsd).times(sellUserCurrencyRate).toFixed()
  },
)

export const selectConfirmedTradeExecution = createSelector(
  selectExecutionSlice,
  selectConfirmedQuoteTradeId,
  (swappers, confirmedTradeId) => {
    if (!confirmedTradeId) return
    return swappers.tradeExecution[confirmedTradeId]
  },
)

export const selectConfirmedTradeExecutionState = createSelector(
  selectExecutionSlice,
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
  selectExecutionSlice,
  selectTradeIdParamFromRequiredFilter,
  selectHopIndexParamFromRequiredFilter,
  (swappers, tradeId, hopIndex) => {
    return hopIndex === 0
      ? swappers.tradeExecution[tradeId]?.firstHop
      : swappers.tradeExecution[tradeId]?.secondHop
  },
)
