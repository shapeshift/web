import { createSelector } from '@reduxjs/toolkit'
import type { AssetId } from '@shapeshiftoss/caip'
import { getDefaultSlippagePercentageForSwapper } from 'constants/constants'
import type { Selector } from 'reselect'
import type { Asset } from 'lib/asset-service'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import type { ProtocolFee, SwapErrorRight, TradeQuote2 } from 'lib/swapper/api'
import { SwapperName } from 'lib/swapper/api'
import type { ApiQuote } from 'state/apis/swappers'
import { selectSwappersApiTradeQuotes } from 'state/apis/swappers/selectors'
import { isCrossAccountTradeSupported } from 'state/helpers'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import { selectFeeAssetById } from 'state/slices/assetsSlice/selectors'
import {
  getHopTotalNetworkFeeFiatPrecision,
  getHopTotalProtocolFeesFiatPrecision,
  getNetReceiveAmountCryptoPrecision,
  getTotalNetworkFeeFiatPrecision,
  getTotalProtocolFeeByAsset,
} from 'state/slices/tradeQuoteSlice/helpers'
import {
  convertBasisPointsToDecimalPercentage,
  sumProtocolFeesToDenom,
} from 'state/zustand/swapperStore/utils'

import { selectCryptoMarketData, selectFiatToUsdRate } from '../marketDataSlice/selectors'

const selectTradeQuoteSlice = (state: ReduxState) => state.tradeQuoteSlice

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

export const selectTotalNetworkFeeFiatPrecision: Selector<ReduxState, string | undefined> =
  createSelector(selectActiveQuote, quote =>
    quote ? getTotalNetworkFeeFiatPrecision(quote) : undefined,
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
    firstHop ? firstHop.sellAmountBeforeFeesCryptoBaseUnit : undefined,
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
  (swapperName): boolean => swapperName === SwapperName.CowSwap,
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

export const selectSlippage = createSelector(
  selectActiveQuote,
  selectActiveSwapperName,
  (activeQuote, activeSwapperName) =>
    activeQuote?.recommendedSlippage ?? getDefaultSlippagePercentageForSwapper(activeSwapperName),
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

const selectSellAssetFiatRate = createSelector(
  selectSellAssetUsdRate,
  selectFiatToUsdRate,
  (sellAssetUsdRate, fiatToUsdRate) => {
    if (sellAssetUsdRate === undefined) return
    return bn(sellAssetUsdRate).times(fiatToUsdRate).toString()
  },
)

const selectBuyAssetFiatRate = createSelector(
  selectBuyAssetUsdRate,
  selectFiatToUsdRate,
  (buyAssetUsdRate, fiatToUsdRate) => {
    if (buyAssetUsdRate === undefined) return
    return bn(buyAssetUsdRate).times(fiatToUsdRate).toString()
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

export const selectSellAmountBeforeFeesCryptoBaseUnit = createSelector(
  selectFirstHop,
  firstHop => firstHop?.sellAmountBeforeFeesCryptoBaseUnit,
)

export const selectBuyAmountBeforeFeesCryptoBaseUnit = createSelector(
  selectLastHop,
  lastHop => lastHop?.buyAmountBeforeFeesCryptoBaseUnit,
)

export const selectSellAmountBeforeFeesCryptoPrecision = createSelector(
  selectSellAmountBeforeFeesCryptoBaseUnit,
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

export const selectNetBuyAmountCryptoPrecision = createSelector(
  selectLastHop,
  selectBuyAmountBeforeFeesCryptoPrecision,
  selectBuyAssetProtocolFeesCryptoPrecision,
  selectSlippage,
  (lastHop, buyAmountBeforeFeesCryptoBaseUnit, buyAssetProtocolFeeCryptoBaseUnit, slippage) => {
    if (!lastHop) return
    return bnOrZero(buyAmountBeforeFeesCryptoBaseUnit)
      .minus(buyAssetProtocolFeeCryptoBaseUnit)
      .times(bn(1).minus(slippage))
      .toFixed()
  },
)

export const selectNetBuyAmountFiat = createSelector(
  selectNetBuyAmountCryptoPrecision,
  selectBuyAssetFiatRate,
  (netBuyAmountCryptoPrecision, buyAssetFiatRate) => {
    if (!netBuyAmountCryptoPrecision || !buyAssetFiatRate) return
    return bn(netBuyAmountCryptoPrecision).times(buyAssetFiatRate).toFixed()
  },
)

export const selectSellAmountFiat = createSelector(
  selectSellAmountCryptoPrecision,
  selectSellAssetFiatRate,
  (sellAmountCryptoPrecision, sellAssetFiatRate) => {
    if (!sellAmountCryptoPrecision || !sellAssetFiatRate) return
    return bn(sellAmountCryptoPrecision).times(sellAssetFiatRate).toFixed()
  },
)

export const selectDonationBps: Selector<ReduxState, string | undefined> = createSelector(
  selectActiveQuote,
  activeQuote => {
    if (!activeQuote) return
    return activeQuote.affiliateBps
  },
)

export const selectDonationAmountFiat = createSelector(
  selectActiveQuote,
  selectSellAmountFiat,
  (activeQuote, sellAmountFiat) => {
    if (!activeQuote) return
    const affiliatePercentage = activeQuote.affiliateBps
      ? convertBasisPointsToDecimalPercentage(activeQuote.affiliateBps)
      : 0
    // The donation amount is a percentage of the sell amount
    return bnOrZero(sellAmountFiat).times(affiliatePercentage).toFixed()
  },
)

export const selectMinimumSellAmountCryptoHuman: Selector<ReduxState, string | undefined> =
  createSelector(selectActiveQuote, quote => (quote ? quote.minimumCryptoHuman : undefined))

export const selectMinimumSellAmountCryptoBaseUnit: Selector<ReduxState, string | undefined> =
  createSelector(
    selectMinimumSellAmountCryptoHuman,
    selectFirstHopSellAsset,
    (minimumSellAmountCryptoHuman, firstHopSellAsset) =>
      minimumSellAmountCryptoHuman && firstHopSellAsset
        ? toBaseUnit(minimumSellAmountCryptoHuman, firstHopSellAsset.precision)
        : undefined,
  )
