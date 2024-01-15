import { createSelector } from '@reduxjs/toolkit'
import type { AssetId } from '@shapeshiftoss/caip'
import type { ProtocolFee, TradeQuote } from '@shapeshiftoss/swapper'
import { SwapperName } from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'
import { getDefaultSlippageDecimalPercentageForSwapper } from 'constants/constants'
import type { Selector } from 'reselect'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import type { ApiQuote, ErrorWithMeta } from 'state/apis/swappers'
import { TradeQuoteError } from 'state/apis/swappers'
import { selectSwappersApiTradeQuotes } from 'state/apis/swappers/selectors'
import { isCrossAccountTradeSupported } from 'state/helpers'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import { selectFeeAssetById } from 'state/slices/assetsSlice/selectors'
import {
  selectFirstHopSellAccountId,
  selectLastHopBuyAccountId,
  selectUserSlippagePercentageDecimal,
} from 'state/slices/swappersSlice/selectors'
import {
  getBuyAmountAfterFeesCryptoPrecision,
  getHopTotalNetworkFeeUserCurrencyPrecision,
  getHopTotalProtocolFeesFiatPrecision,
  getTotalProtocolFeeByAsset,
} from 'state/slices/tradeQuoteSlice/helpers'
import {
  convertBasisPointsToDecimalPercentage,
  sumProtocolFeesToDenom,
} from 'state/slices/tradeQuoteSlice/utils'

import {
  selectCryptoMarketData,
  selectSelectedCurrencyMarketDataSortedByMarketCap,
  selectUserCurrencyToUsdRate,
} from '../marketDataSlice/selectors'
import { selectAccountIdByAccountNumberAndChainId } from '../portfolioSlice/selectors'

const selectTradeQuoteSlice = (state: ReduxState) => state.tradeQuoteSlice

export const selectActiveStepOrDefault: Selector<ReduxState, number> = createSelector(
  selectTradeQuoteSlice,
  tradeQuote => tradeQuote.activeStep ?? 0,
)

const selectConfirmedQuote: Selector<ReduxState, TradeQuote | undefined> =
  createDeepEqualOutputSelector(selectTradeQuoteSlice, tradeQuote => tradeQuote.confirmedQuote)

export const selectActiveQuoteIndex: Selector<ReduxState, number | undefined> = createSelector(
  selectTradeQuoteSlice,
  tradeQuote => tradeQuote.activeQuoteIndex,
)

export const selectActiveSwapperName: Selector<ReduxState, SwapperName | undefined> =
  createSelector(
    selectActiveQuoteIndex,
    selectSwappersApiTradeQuotes,
    (activeQuoteIndex, apiQuotes) =>
      activeQuoteIndex !== undefined ? apiQuotes[activeQuoteIndex]?.swapperName : undefined,
  )

export const selectActiveSwapperApiResponse: Selector<ReduxState, ApiQuote | undefined> =
  createDeepEqualOutputSelector(
    selectSwappersApiTradeQuotes,
    selectActiveQuoteIndex,
    (quotes, activeQuoteIndex) => {
      // If the active quote was reset, we do NOT want to return a stale quote as an "active" quote
      if (activeQuoteIndex === undefined) return undefined

      const selectedQuote = quotes[activeQuoteIndex]
      if (selectedQuote?.quote !== undefined) {
        return selectedQuote
      } else {
        const successfulQuotes = quotes.filter(({ quote }) => quote !== undefined)
        return successfulQuotes.length > 0 ? successfulQuotes[0] : undefined
      }
    },
  )

export const selectActiveQuote: Selector<ReduxState, TradeQuote | undefined> =
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

export const selectActiveQuoteErrors: Selector<
  ReduxState,
  ErrorWithMeta<TradeQuoteError>[] | undefined
> = createDeepEqualOutputSelector(selectActiveSwapperApiResponse, response => response?.errors)

export const selectActiveQuoteWarnings: Selector<
  ReduxState,
  ErrorWithMeta<TradeQuoteError>[] | undefined
> = createDeepEqualOutputSelector(selectActiveSwapperApiResponse, response => response?.warnings)

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
    selectUserCurrencyToUsdRate,
    selectCryptoMarketData,
    (_state: ReduxState, step: number) => step,
    (quote, userCurrencyToUsdRate, cryptoMarketDataById, step) =>
      quote && quote.steps[step]
        ? getHopTotalProtocolFeesFiatPrecision(
            quote.steps[step],
            userCurrencyToUsdRate,
            cryptoMarketDataById,
          )
        : undefined,
  )

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

export const selectFirstHop: Selector<ReduxState, TradeQuote['steps'][number] | undefined> =
  createDeepEqualOutputSelector(selectActiveQuote, quote => (quote ? quote.steps[0] : undefined))

export const selectLastHop: Selector<ReduxState, TradeQuote['steps'][number] | undefined> =
  createDeepEqualOutputSelector(selectActiveQuote, quote =>
    quote ? quote.steps[quote.steps.length - 1] : undefined,
  )

// selects the second hop if it exists. This is different to "last hop"
export const selectSecondHop: Selector<ReduxState, TradeQuote['steps'][number] | undefined> =
  createDeepEqualOutputSelector(selectActiveQuote, quote => (quote ? quote.steps[1] : undefined))

export const selectFirstHopSellAsset: Selector<ReduxState, Asset | undefined> =
  createDeepEqualOutputSelector(selectFirstHop, firstHop =>
    firstHop ? firstHop.sellAsset : undefined,
  )

export const selectFirstHopBuyAsset: Selector<ReduxState, Asset | undefined> =
  createDeepEqualOutputSelector(selectFirstHop, firstHop =>
    firstHop ? firstHop.buyAsset : undefined,
  )

export const selectSecondHopSellAsset: Selector<ReduxState, Asset | undefined> =
  createDeepEqualOutputSelector(selectSecondHop, secondHop =>
    secondHop ? secondHop.sellAsset : undefined,
  )

export const selectSecondHopBuyAsset: Selector<ReduxState, Asset | undefined> =
  createDeepEqualOutputSelector(selectSecondHop, secondHop =>
    secondHop ? secondHop.buyAsset : undefined,
  )

// last hop !== second hop for single hop trades. Used to handling end-state of trades
export const selectLastHopSellAsset: Selector<ReduxState, Asset | undefined> =
  createDeepEqualOutputSelector(selectLastHop, lastHop => (lastHop ? lastHop.sellAsset : undefined))

export const selectLastHopBuyAsset: Selector<ReduxState, Asset | undefined> =
  createDeepEqualOutputSelector(selectLastHop, lastHop => (lastHop ? lastHop.buyAsset : undefined))

export const selectSellAmountCryptoBaseUnit: Selector<ReduxState, string | undefined> =
  createSelector(selectFirstHop, firstHop =>
    firstHop ? firstHop.sellAmountIncludingProtocolFeesCryptoBaseUnit : undefined,
  )

export const selectIsUnsafeActiveQuote: Selector<ReduxState, boolean> = createSelector(
  selectActiveQuoteWarnings,
  activeQuoteWarnings => {
    return !!activeQuoteWarnings?.some(({ error }) => error === TradeQuoteError.UnsafeQuote)
  },
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

export const selectSecondHopNetworkFeeCryptoBaseUnit: Selector<ReduxState, string | undefined> =
  createSelector(selectSecondHop, secondHop => secondHop?.feeData.networkFeeCryptoBaseUnit)

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

export const selectSecondHopNetworkFeeCryptoPrecision: Selector<ReduxState, string | undefined> =
  createSelector(
    selectNetworkFeeRequiresBalance,
    selectSecondHopSellFeeAsset,
    selectSecondHopNetworkFeeCryptoBaseUnit,
    (networkFeeRequiresBalance, secondHopSellFeeAsset, secondHopNetworkFeeCryptoBaseUnit) =>
      networkFeeRequiresBalance && secondHopSellFeeAsset
        ? fromBaseUnit(bnOrZero(secondHopNetworkFeeCryptoBaseUnit), secondHopSellFeeAsset.precision)
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

export const selectFirstHopNetworkFeeUserCurrencyPrecision: Selector<
  ReduxState,
  string | undefined
> = createSelector(
  selectFirstHop,
  selectFirstHopSellFeeAsset,
  selectSelectedCurrencyMarketDataSortedByMarketCap,
  (tradeQuoteStep, feeAsset, cryptoMarketData) => {
    if (!tradeQuoteStep) return

    if (feeAsset === undefined) {
      throw Error(`missing fee asset for assetId ${tradeQuoteStep.sellAsset.assetId}`)
    }

    const getFeeAssetUserCurrencyRate = () => {
      return cryptoMarketData[feeAsset?.assetId ?? '']?.price ?? '0'
    }

    return getHopTotalNetworkFeeUserCurrencyPrecision(
      tradeQuoteStep.feeData.networkFeeCryptoBaseUnit,
      feeAsset,
      getFeeAssetUserCurrencyRate,
    )?.toString()
  },
)

export const selectSecondHopNetworkFeeUserCurrencyPrecision: Selector<
  ReduxState,
  string | undefined
> = createSelector(
  selectSecondHop,
  selectSecondHopSellFeeAsset,
  selectSelectedCurrencyMarketDataSortedByMarketCap,
  (tradeQuoteStep, feeAsset, cryptoMarketData) => {
    if (!tradeQuoteStep) return

    if (feeAsset === undefined) {
      throw Error(`missing fee asset for assetId ${tradeQuoteStep.sellAsset.assetId}`)
    }
    const getFeeAssetUserCurrencyRate = () => {
      return cryptoMarketData[feeAsset?.assetId ?? '']?.price ?? '0'
    }

    return getHopTotalNetworkFeeUserCurrencyPrecision(
      tradeQuoteStep.feeData.networkFeeCryptoBaseUnit,
      feeAsset,
      getFeeAssetUserCurrencyRate,
    )?.toString()
  },
)

export const selectHopNetworkFeeUserCurrencyPrecision = createDeepEqualOutputSelector(
  selectFirstHopNetworkFeeUserCurrencyPrecision,
  selectSecondHopNetworkFeeUserCurrencyPrecision,
  (_state: ReduxState, hopIndex: number) => hopIndex,
  (firstHopNetworkFeeUserCurrencyPrecision, secondHopNetworkFeeUserCurrencyPrecision, hopIndex) => {
    return hopIndex === 0
      ? firstHopNetworkFeeUserCurrencyPrecision
      : secondHopNetworkFeeUserCurrencyPrecision
  },
)

export const selectTotalNetworkFeeUserCurrencyPrecision: Selector<ReduxState, string> =
  createSelector(
    selectFirstHopNetworkFeeUserCurrencyPrecision,
    selectSecondHopNetworkFeeUserCurrencyPrecision,
    (firstHopNetworkFeeUserCurrencyPrecision, secondHopNetworkFeeUserCurrencyPrecision) =>
      bnOrZero(firstHopNetworkFeeUserCurrencyPrecision)
        .plus(secondHopNetworkFeeUserCurrencyPrecision ?? 0)
        .toString(),
  )

export const selectDefaultSlippagePercentage: Selector<ReduxState, string> = createSelector(
  selectActiveSwapperName,
  activeSwapperName =>
    bn(getDefaultSlippageDecimalPercentageForSwapper(activeSwapperName)).times(100).toString(),
)

export const selectTradeSlippagePercentageDecimal: Selector<ReduxState, string> = createSelector(
  selectActiveSwapperName,
  selectUserSlippagePercentageDecimal,
  (activeSwapperName, slippagePreferencePercentage) => {
    return (
      slippagePreferencePercentage ??
      getDefaultSlippageDecimalPercentageForSwapper(activeSwapperName)
    )
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

export const selectBuyAmountAfterFeesUserCurrency = createSelector(
  selectBuyAmountAfterFeesCryptoPrecision,
  selectBuyAssetUserCurrencyRate,
  (buyAmountCryptoPrecision, buyAssetUserCurrencyRate) => {
    if (!buyAmountCryptoPrecision || !buyAssetUserCurrencyRate) return
    return bn(buyAmountCryptoPrecision).times(buyAssetUserCurrencyRate).toFixed()
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

export const selectActiveQuoteAffiliateBps: Selector<ReduxState, string | undefined> =
  createSelector(selectActiveQuote, activeQuote => {
    if (!activeQuote) return
    return activeQuote.affiliateBps
  })

export const selectActiveQuotePotentialAffiliateBps: Selector<ReduxState, string | undefined> =
  createSelector(selectActiveQuote, activeQuote => {
    if (!activeQuote) return
    return activeQuote.potentialAffiliateBps
  })

export const selectPotentialAffiliateFeeAmountUserCurrency: Selector<
  ReduxState,
  string | undefined
> = createSelector(
  selectSellAmountUserCurrency,
  selectActiveQuotePotentialAffiliateBps,
  (sellAmountUserCurrency, potentialAffiliateBps) => {
    if (potentialAffiliateBps === undefined) return undefined
    else {
      const affiliatePercentage = convertBasisPointsToDecimalPercentage(
        potentialAffiliateBps ?? '0',
      )
      // The affiliate fee amount is a percentage of the sell amount
      return bnOrZero(sellAmountUserCurrency).times(affiliatePercentage).toFixed()
    }
  },
)

export const selectPotentialAffiliateFeeAmountUsd: Selector<ReduxState, string | undefined> =
  createSelector(
    selectPotentialAffiliateFeeAmountUserCurrency,
    selectUserCurrencyToUsdRate,
    (affiliateFeeUserCurrency, userCurrencyToUsdRate) => {
      if (affiliateFeeUserCurrency === undefined) return undefined

      return bnOrZero(affiliateFeeUserCurrency).div(userCurrencyToUsdRate).toFixed()
    },
  )

export const selectQuoteAffiliateFeeUserCurrency = createSelector(
  selectActiveQuote,
  selectSellAmountUserCurrency,
  selectActiveQuoteAffiliateBps,
  (activeQuote, sellAmountUserCurrency, affiliateBps) => {
    if (!activeQuote) return '0'
    const affiliatePercentage = affiliateBps
      ? convertBasisPointsToDecimalPercentage(affiliateBps)
      : 0
    // The affiliate fee amount is a percentage of the sell amount
    return bnOrZero(sellAmountUserCurrency).times(affiliatePercentage).toFixed()
  },
)
export const selectQuoteFeeAmountUsd = createSelector(
  selectQuoteAffiliateFeeUserCurrency,
  selectUserCurrencyToUsdRate,
  (feeAmountUserCurrency, userCurrencyToUsdRate) => {
    return bnOrZero(feeAmountUserCurrency).div(userCurrencyToUsdRate).toFixed()
  },
)

export const selectTradeExecutionState = createSelector(
  selectTradeQuoteSlice,
  swappers => swappers.tradeExecution.state,
)

// selects the account ID we're buying into for the first hop
export const selectFirstHopBuyAccountId = createSelector(
  selectIsActiveQuoteMultiHop,
  selectLastHopBuyAccountId,
  selectFirstHop,
  selectFirstHopBuyAsset,
  selectAccountIdByAccountNumberAndChainId,
  (
    isMultiHopTrade,
    lastHopBuyAccountId,
    firstHop,
    buyAsset,
    accountIdByAccountNumberAndChainId,
  ) => {
    // single hop trade - same as last hop
    if (!isMultiHopTrade) return lastHopBuyAccountId

    return buyAsset !== undefined && firstHop !== undefined
      ? accountIdByAccountNumberAndChainId[firstHop.accountNumber]?.[buyAsset.chainId]
      : undefined
  },
)

// selects the account ID we're selling from for the second hop if it exists. This is different to "last hop"
export const selectSecondHopSellAccountId = createSelector(
  selectIsActiveQuoteMultiHop,
  selectFirstHopBuyAccountId,
  (isMultiHopTrade, firstHopBuyAccountId) => {
    // single hop trade - no sell account id for this hop as it doesn't exist
    if (!isMultiHopTrade) return undefined

    // multi hop trade - the second hop sell account id is the same as the first hop buy account id
    return firstHopBuyAccountId
  },
)

// selects the account ID we're selling from for the last hop
export const selectLastHopSellAccountId = createSelector(
  selectIsActiveQuoteMultiHop,
  selectFirstHopSellAccountId,
  selectSecondHopSellAccountId,
  (isMultiHopTrade, firstHopSellAccountId, secondHopSellAccountId) => {
    return isMultiHopTrade ? firstHopSellAccountId : secondHopSellAccountId
  },
)

// selects the account ID we're selling from for the given hop
export const selectHopSellAccountId = createSelector(
  selectFirstHopSellAccountId,
  selectSecondHopSellAccountId,
  (_state: ReduxState, hopIndex: number) => hopIndex,
  (firstHopSellAccountId, secondHopSellAccountId, hopIndex) => {
    return hopIndex === 0 ? firstHopSellAccountId : secondHopSellAccountId
  },
)

export const selectHopExecutionMetadata = createDeepEqualOutputSelector(
  selectTradeQuoteSlice,
  (_state: ReduxState, hopIndex: number) => hopIndex,
  (swappers, hopIndex) => {
    return hopIndex === 0 ? swappers.tradeExecution.firstHop : swappers.tradeExecution.secondHop
  },
)
