import { createSelector } from '@reduxjs/toolkit'
import type { AssetId } from '@shapeshiftoss/caip'
import { getDefaultSlippagePercentageForSwapper } from 'constants/constants'
import type { Selector } from 'reselect'
import { DEFAULT_SWAPPER_DONATION_BPS } from 'components/MultiHopTrade/constants'
import type { Asset } from 'lib/asset-service'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import type { ProtocolFee, SwapErrorRight, TradeQuote2 } from 'lib/swapper/api'
import { SwapperName } from 'lib/swapper/api'
import type { ApiQuote } from 'state/apis/swappers'
import { selectSwappersApiTradeQuotes } from 'state/apis/swappers/selectors'
import { isCrossAccountTradeSupported } from 'state/helpers'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import { selectFeeAssetById } from 'state/slices/assetsSlice/selectors'
import { selectUserSlippagePercentageDecimal } from 'state/slices/swappersSlice/selectors'
import {
  getHopTotalNetworkFeeFiatPrecision,
  getHopTotalProtocolFeesFiatPrecision,
  getNetReceiveAmountCryptoPrecision,
  getTotalNetworkFeeUserCurrencyPrecision,
  getTotalProtocolFeeByAsset,
} from 'state/slices/tradeQuoteSlice/helpers'
import {
  convertBasisPointsToDecimalPercentage,
  sumProtocolFeesToDenom,
} from 'state/slices/tradeQuoteSlice/utils'

import { selectCryptoMarketData, selectUserCurrencyToUsdRate } from '../marketDataSlice/selectors'

const selectTradeQuoteSlice = (state: ReduxState) => state.tradeQuoteSlice

export const selectActiveStepOrDefault: Selector<ReduxState, number> = createSelector(
  selectTradeQuoteSlice,
  tradeQuote => tradeQuote.activeStep ?? 0,
)

const selectConfirmedQuote: Selector<ReduxState, TradeQuote2 | undefined> =
  createDeepEqualOutputSelector(selectTradeQuoteSlice, tradeQuote => tradeQuote.confirmedQuote)

export const selectActiveSwapperName: Selector<ReduxState, SwapperName | undefined> =
  createSelector(
    selectTradeQuoteSlice,
    selectSwappersApiTradeQuotes,
    (tradeQuote, apiQuotes) => tradeQuote.activeSwapperName ?? apiQuotes[0]?.swapperName,
  )

export const selectActiveSwapperApiResponse: Selector<ReduxState, ApiQuote | undefined> =
  createDeepEqualOutputSelector(
    selectSwappersApiTradeQuotes,
    selectActiveSwapperName,
    (quotes, activeSwapperName) => {
      const selectedQuote = quotes.find(quote => quote.swapperName === activeSwapperName)
      if (selectedQuote?.quote !== undefined) {
        return selectedQuote
      } else {
        const successfulQuotes = quotes.filter(({ quote }) => quote !== undefined)
        return successfulQuotes.length > 0 ? successfulQuotes[0] : undefined
      }
    },
  )

export const selectActiveQuote: Selector<ReduxState, TradeQuote2 | undefined> =
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

export const selectIsLastStep: Selector<ReduxState, boolean> = createSelector(
  selectActiveStepOrDefault,
  selectActiveQuote,
  (activeStep, tradeQuote) => Boolean(tradeQuote && tradeQuote.steps.length - 1 === activeStep),
)

export const selectActiveQuoteError: Selector<ReduxState, SwapErrorRight | undefined> =
  createDeepEqualOutputSelector(selectActiveSwapperApiResponse, response => response?.error)

/*
  Cross-account trading means trades that are either:
    - Trades between assets on the same chain but different accounts
    - Trades between assets on different chains (and possibly different accounts)
   When adding a new swapper, ensure that `true` is returned here if either of the above apply.
   */
export const selectSwapperSupportsCrossAccountTrade: Selector<ReduxState, boolean | undefined> =
  createSelector(selectActiveSwapperName, activeSwapperName => {
    if (activeSwapperName === undefined) return undefined

    return isCrossAccountTradeSupported(activeSwapperName)
  })

export const selectHopTotalProtocolFeesFiatPrecision: Selector<ReduxState, string | undefined> =
  createSelector(
    selectActiveQuote,
    (_state: ReduxState, step: 0 | 1) => step,
    (quote, step) =>
      quote && quote.steps[step]
        ? getHopTotalProtocolFeesFiatPrecision(quote.steps[step])
        : undefined,
  )

export const selectHopTotalNetworkFeeFiatPrecision: Selector<ReduxState, string | undefined> =
  createSelector(
    selectActiveQuote,
    (_state: ReduxState, step: 0 | 1) => step,
    (quote, step) =>
      quote && quote.steps[step]
        ? getHopTotalNetworkFeeFiatPrecision(quote.steps[step])
        : undefined,
  )

export const selectNetReceiveAmountCryptoPrecision: Selector<ReduxState, string | undefined> =
  createSelector(selectActiveQuote, selectActiveSwapperName, (quote, swapperName) =>
    quote && swapperName ? getNetReceiveAmountCryptoPrecision({ quote, swapperName }) : undefined,
  )

export const selectTotalNetworkFeeUserCurrencyPrecision: Selector<ReduxState, string | undefined> =
  createSelector(selectActiveQuote, quote =>
    quote ? getTotalNetworkFeeUserCurrencyPrecision(quote) : undefined,
  )

export const selectTotalProtocolFeeByAsset: Selector<
  ReduxState,
  Record<AssetId, ProtocolFee> | undefined
> = createDeepEqualOutputSelector(selectActiveQuote, quote =>
  quote ? getTotalProtocolFeeByAsset(quote) : undefined,
)

export const selectFirstHop: Selector<ReduxState, TradeQuote2['steps'][number] | undefined> =
  createDeepEqualOutputSelector(selectActiveQuote, quote => (quote ? quote.steps[0] : undefined))

export const selectLastHop: Selector<ReduxState, TradeQuote2['steps'][number] | undefined> =
  createDeepEqualOutputSelector(selectActiveQuote, quote =>
    quote ? quote.steps[quote.steps.length - 1] : undefined,
  )

export const selectFirstHopSellAsset: Selector<ReduxState, Asset | undefined> =
  createDeepEqualOutputSelector(selectFirstHop, firstHop =>
    firstHop ? firstHop.sellAsset : undefined,
  )

export const selectFirstHopBuyAsset: Selector<ReduxState, Asset | undefined> =
  createDeepEqualOutputSelector(selectFirstHop, firstHop =>
    firstHop ? firstHop.buyAsset : undefined,
  )

export const selectLastHopSellAsset: Selector<ReduxState, Asset | undefined> =
  createDeepEqualOutputSelector(selectLastHop, lastHop => (lastHop ? lastHop.sellAsset : undefined))

export const selectLastHopBuyAsset: Selector<ReduxState, Asset | undefined> =
  createDeepEqualOutputSelector(selectLastHop, lastHop => (lastHop ? lastHop.buyAsset : undefined))

export const selectSellAmountCryptoBaseUnit: Selector<ReduxState, string | undefined> =
  createSelector(selectFirstHop, firstHop =>
    firstHop ? firstHop.sellAmountIncludingProtocolFeesCryptoBaseUnit : undefined,
  )

export const selectSellAmountCryptoPrecision: Selector<ReduxState, string | undefined> =
  createSelector(
    selectFirstHopSellAsset,
    selectSellAmountCryptoBaseUnit,
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

export const selectLastHopSellFeeAsset: Selector<ReduxState, Asset | undefined> =
  createDeepEqualOutputSelector(
    (state: ReduxState) => selectFeeAssetById(state, selectLastHopSellAsset(state)?.assetId ?? ''),
    lastHopSellFeeAsset => lastHopSellFeeAsset,
  )

// when trading from fee asset, the value of TX in fee asset is deducted
export const selectFirstHopTradeDeductionCryptoPrecision: Selector<ReduxState, string | undefined> =
  createSelector(
    selectFirstHopSellFeeAsset,
    selectFirstHopSellAsset,
    selectSellAmountCryptoPrecision,
    (firstHopSellFeeAsset, firstHopSellAsset, sellAmountCryptoPrecision) =>
      firstHopSellFeeAsset?.assetId === firstHopSellAsset?.assetId
        ? bnOrZero(sellAmountCryptoPrecision).toFixed()
        : bn(0).toFixed(),
  )

// TODO(woodenfurniture): update swappers to specify this as with protocol fees
export const selectNetworkFeeRequiresBalance: Selector<ReduxState, boolean> = createSelector(
  selectActiveSwapperName,
  (swapperName): boolean => swapperName !== SwapperName.CowSwap,
)

export const selectFirstHopNetworkFeeCryptoBaseUnit: Selector<ReduxState, string | undefined> =
  createSelector(selectFirstHop, firstHop => firstHop?.feeData.networkFeeCryptoBaseUnit)

export const selectLastHopNetworkFeeCryptoBaseUnit: Selector<ReduxState, string | undefined> =
  createSelector(selectLastHop, lastHop => lastHop?.feeData.networkFeeCryptoBaseUnit)
export const selectFirstHopNetworkFeeCryptoPrecision: Selector<ReduxState, string | undefined> =
  createSelector(
    selectNetworkFeeRequiresBalance,
    selectFirstHopSellFeeAsset,
    selectFirstHopNetworkFeeCryptoBaseUnit,
    (networkFeeRequiresBalance, firstHopSellFeeAsset, firstHopNetworkFeeCryptoBaseUnit) =>
      networkFeeRequiresBalance && firstHopSellFeeAsset
        ? fromBaseUnit(bnOrZero(firstHopNetworkFeeCryptoBaseUnit), firstHopSellFeeAsset.precision)
        : bn(0).toFixed(),
  )

export const selectLastHopNetworkFeeCryptoPrecision: Selector<ReduxState, string> = createSelector(
  selectNetworkFeeRequiresBalance,
  selectLastHopSellFeeAsset,
  selectLastHopNetworkFeeCryptoBaseUnit,
  (networkFeeRequiresBalance, lastHopSellFeeAsset, lastHopNetworkFeeCryptoBaseUnit) =>
    networkFeeRequiresBalance && lastHopSellFeeAsset
      ? fromBaseUnit(bnOrZero(lastHopNetworkFeeCryptoBaseUnit), lastHopSellFeeAsset.precision)
      : bn(0).toFixed(),
)

export const selectQuoteOrDefaultSlippagePercentageDecimal: Selector<ReduxState, string> =
  createSelector(
    selectActiveQuote,
    selectActiveSwapperName,
    (activeQuote, activeSwapperName) =>
      activeQuote?.recommendedSlippage ?? getDefaultSlippagePercentageForSwapper(activeSwapperName),
  )

export const selectQuoteOrDefaultSlippagePercentage: Selector<ReduxState, string> = createSelector(
  selectQuoteOrDefaultSlippagePercentageDecimal,
  slippagePercentageDecimal => bn(slippagePercentageDecimal).times(100).toString(),
)

export const selectTradeSlippagePercentageDecimal: Selector<ReduxState, string> = createSelector(
  selectQuoteOrDefaultSlippagePercentageDecimal,
  selectUserSlippagePercentageDecimal,
  (quoteOrDefaultSlippagePercentage, slippagePreferencePercentage) => {
    return slippagePreferencePercentage ?? quoteOrDefaultSlippagePercentage
  },
)

const selectSellAssetUsdRate = createSelector(
  selectFirstHopSellAsset,
  selectCryptoMarketData,
  (sellAsset, cryptoMarketDataById) => {
    if (sellAsset === undefined) return
    return cryptoMarketDataById[sellAsset.assetId]?.price
  },
)

const selectBuyAssetUsdRate = createSelector(
  selectLastHopBuyAsset,
  selectCryptoMarketData,
  (buyAsset, cryptoMarketDataById) => {
    if (buyAsset === undefined) return
    return cryptoMarketDataById[buyAsset.assetId]?.price
  },
)

const selectSellAssetUserCurrencyRate = createSelector(
  selectSellAssetUsdRate,
  selectUserCurrencyToUsdRate,
  (sellAssetUsdRate, userCurrencyToUsdRate) => {
    if (sellAssetUsdRate === undefined) return
    return bn(sellAssetUsdRate).times(userCurrencyToUsdRate).toString()
  },
)

const selectBuyAssetUserCurrencyRate = createSelector(
  selectBuyAssetUsdRate,
  selectUserCurrencyToUsdRate,
  (buyAssetUsdRate, userCurrencyToUsdRate) => {
    if (buyAssetUsdRate === undefined) return
    return bn(buyAssetUsdRate).times(userCurrencyToUsdRate).toString()
  },
)

export const selectTotalTradeFeeBuyAssetBaseUnit = createSelector(
  selectLastHop,
  selectCryptoMarketData,
  selectBuyAssetUsdRate,
  (lastHop, cryptoMarketDataById, buyAssetUsdRate) => {
    if (!lastHop || !buyAssetUsdRate) return '0'

    return sumProtocolFeesToDenom({
      cryptoMarketDataById,
      protocolFees: lastHop.feeData.protocolFees,
      outputAssetPriceUsd: buyAssetUsdRate,
      outputExponent: lastHop.buyAsset.precision,
    })
  },
)

export const selectSellAmountIncludingProtocolFeesCryptoBaseUnit = createSelector(
  selectFirstHop,
  firstHop => firstHop?.sellAmountIncludingProtocolFeesCryptoBaseUnit,
)

export const selectBuyAmountBeforeFeesCryptoBaseUnit = createSelector(
  selectLastHop,
  lastHop => lastHop?.buyAmountBeforeFeesCryptoBaseUnit,
)

export const selectSellAmountBeforeFeesCryptoPrecision = createSelector(
  selectSellAmountIncludingProtocolFeesCryptoBaseUnit,
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

export const selectBuyAssetProtocolFeesCryptoPrecision = createSelector(selectLastHop, lastHop => {
  if (!lastHop) return '0'
  const protocolFees = lastHop.feeData.protocolFees
  return fromBaseUnit(
    protocolFees[lastHop.buyAsset.assetId]?.amountCryptoBaseUnit ?? '0',
    lastHop.buyAsset.precision,
  )
})

export const selectReceiveBuyAmountUserCurrency = createSelector(
  selectNetReceiveAmountCryptoPrecision,
  selectBuyAssetUserCurrencyRate,
  (netReceiveAmountCryptoPrecision, buyAssetUserCurrencyRate) => {
    if (!netReceiveAmountCryptoPrecision || !buyAssetUserCurrencyRate) return
    return bn(netReceiveAmountCryptoPrecision).times(buyAssetUserCurrencyRate).toFixed()
  },
)

export const selectBuyAmountBeforeFeesUserCurrency = createSelector(
  selectBuyAmountBeforeFeesCryptoPrecision,
  selectBuyAssetUserCurrencyRate,
  (buyAmountBeforeFeesCryptoPrecision, buyAssetUserCurrencyRate) => {
    if (!buyAmountBeforeFeesCryptoPrecision || !buyAssetUserCurrencyRate) return
    return bn(buyAmountBeforeFeesCryptoPrecision).times(buyAssetUserCurrencyRate).toFixed()
  },
)

export const selectSellAmountUsd = createSelector(
  selectSellAmountCryptoPrecision,
  selectSellAssetUsdRate,
  (sellAmountCryptoPrecision, sellAssetUsdRate) => {
    if (!sellAmountCryptoPrecision || !sellAssetUsdRate) return
    return bn(sellAmountCryptoPrecision).times(sellAssetUsdRate).toFixed()
  },
)

export const selectSellAmountUserCurrency = createSelector(
  selectSellAmountCryptoPrecision,
  selectSellAssetUserCurrencyRate,
  (sellAmountCryptoPrecision, sellAssetUserCurrencyRate) => {
    if (!sellAmountCryptoPrecision || !sellAssetUserCurrencyRate) return
    return bn(sellAmountCryptoPrecision).times(sellAssetUserCurrencyRate).toFixed()
  },
)

export const selectActiveQuoteDonationBps: Selector<ReduxState, string | undefined> =
  createSelector(selectActiveQuote, activeQuote => {
    if (!activeQuote) return
    return activeQuote.affiliateBps
  })

export const selectPotentialDonationAmountUserCurrency: Selector<ReduxState, string | undefined> =
  createSelector(
    selectActiveQuote,
    selectSellAmountUserCurrency,
    (activeQuote, sellAmountUserCurrency) => {
      if (activeQuote?.affiliateBps === undefined) return undefined
      else {
        const affiliatePercentage = convertBasisPointsToDecimalPercentage(
          DEFAULT_SWAPPER_DONATION_BPS,
        )
        // The donation amount is a percentage of the sell amount
        return bnOrZero(sellAmountUserCurrency).times(affiliatePercentage).toFixed()
      }
    },
  )

export const selectQuoteDonationAmountUserCurrency = createSelector(
  selectActiveQuote,
  selectSellAmountUserCurrency,
  (activeQuote, sellAmountUserCurrency) => {
    if (!activeQuote) return
    const affiliatePercentage = activeQuote.affiliateBps
      ? convertBasisPointsToDecimalPercentage(activeQuote.affiliateBps)
      : 0
    // The donation amount is a percentage of the sell amount
    return bnOrZero(sellAmountUserCurrency).times(affiliatePercentage).toFixed()
  },
)
export const selectQuoteDonationAmountUsd = createSelector(
  selectQuoteDonationAmountUserCurrency,
  selectUserCurrencyToUsdRate,
  (donationAmountUserCurrency, userCurrencyToUsdRate) => {
    return bnOrZero(donationAmountUserCurrency).div(userCurrencyToUsdRate).toFixed()
  },
)
