import { createSelector } from '@reduxjs/toolkit'
import type { AssetId } from '@shapeshiftoss/caip'
import type { ProtocolFee, TradeQuote } from '@shapeshiftoss/swapper'
import { SwapperName } from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'
import { getDefaultSlippageDecimalPercentageForSwapper } from 'constants/constants'
import type { Selector } from 'reselect'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { isSome } from 'lib/utils'
import type { ApiQuote, ErrorWithMeta, TradeQuoteError } from 'state/apis/swapper'
import { TradeQuoteRequestError, TradeQuoteWarning } from 'state/apis/swapper'
import { validateQuoteRequest } from 'state/apis/swapper/helpers/validateQuoteRequest'
import { isCrossAccountTradeSupported } from 'state/helpers'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import { selectFeeAssetById } from 'state/slices/assetsSlice/selectors'
import {
  selectFirstHopSellAccountId,
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
} from 'state/slices/tradeInputSlice/selectors'
import {
  getBuyAmountAfterFeesCryptoPrecision,
  getHopTotalNetworkFeeUserCurrencyPrecision,
  getHopTotalProtocolFeesFiatPrecision,
  getTotalProtocolFeeByAsset,
  sortQuotes,
} from 'state/slices/tradeQuoteSlice/helpers'
import { convertBasisPointsToDecimalPercentage } from 'state/slices/tradeQuoteSlice/utils'

import { selectIsWalletConnected, selectWalletSupportedChainIds } from '../common-selectors'
import {
  selectCryptoMarketData,
  selectSelectedCurrencyMarketDataSortedByMarketCap,
  selectUserCurrencyToUsdRate,
} from '../marketDataSlice/selectors'

const selectTradeQuoteSlice = (state: ReduxState) => state.tradeQuoteSlice

const selectTradeQuotes = createDeepEqualOutputSelector(
  selectTradeQuoteSlice,
  tradeQuoteSlice => tradeQuoteSlice.tradeQuotes,
)

// this is required to break a race condition between rtk query and our selectors
// we're treating redux as the source of truth.
export const selectIsSwapperQuoteAvailable = createDeepEqualOutputSelector(
  selectTradeQuotes,
  tradeQuotes => {
    return Object.values(SwapperName).reduce(
      (acc, swapperName) => {
        acc[swapperName as SwapperName] = tradeQuotes[swapperName] !== undefined
        return acc
      },
      {} as Record<SwapperName, boolean>,
    )
  },
)

export const selectTradeQuoteRequestErrors = createDeepEqualOutputSelector(
  selectInputSellAmountCryptoBaseUnit,
  selectIsWalletConnected,
  selectWalletSupportedChainIds,
  selectManualReceiveAddress,
  selectSellAssetBalanceCryptoBaseUnit,
  selectInputSellAsset,
  selectInputBuyAsset,
  (
    inputSellAmountCryptoBaseUnit,
    isWalletConnected,
    walletSupportedChainIds,
    manualReceiveAddress,
    sellAssetBalanceCryptoBaseUnit,
    sellAsset,
    buyAsset,
  ) => {
    const hasUserEnteredAmount = bnOrZero(inputSellAmountCryptoBaseUnit).gt(0)
    if (!hasUserEnteredAmount) return []

    const topLevelValidationErrors = validateQuoteRequest({
      isWalletConnected,
      walletSupportedChainIds,
      manualReceiveAddress,
      sellAssetBalanceCryptoBaseUnit,
      sellAmountCryptoBaseUnit: inputSellAmountCryptoBaseUnit,
      sellAsset,
      buyAsset,
    })

    return topLevelValidationErrors
  },
)

export const selectTradeQuoteResponseErrors = createDeepEqualOutputSelector(
  selectInputSellAmountCryptoBaseUnit,
  selectTradeQuotes,
  (inputSellAmountCryptoBaseUnit, swappersApiTradeQuotes) => {
    const hasUserEnteredAmount = bnOrZero(inputSellAmountCryptoBaseUnit).gt(0)
    if (!hasUserEnteredAmount) return []

    const numSwappers = Object.values(SwapperName).length - 1 // minus 1 because test swapper not used

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
  selectTradeQuotes,
  tradeQuotes => {
    const allQuotes = Object.values(tradeQuotes)
      .filter(isSome)
      .map(swapperQuotes => Object.values(swapperQuotes))
      .flat()
    const happyQuotes = sortQuotes(allQuotes.filter(({ errors }) => errors.length === 0))
    const errorQuotes = sortQuotes(allQuotes.filter(({ errors }) => errors.length > 0))
    return [...happyQuotes, ...errorQuotes]
  },
)

export const selectActiveStepOrDefault: Selector<ReduxState, number> = createSelector(
  selectTradeQuoteSlice,
  tradeQuote => tradeQuote.activeStep ?? 0,
)

const selectConfirmedQuote: Selector<ReduxState, TradeQuote | undefined> =
  createDeepEqualOutputSelector(selectTradeQuoteSlice, tradeQuote => tradeQuote.confirmedQuote)

export const selectActiveQuoteMeta: Selector<
  ReduxState,
  { swapperName: SwapperName; identifier: string } | undefined
> = createSelector(selectTradeQuoteSlice, tradeQuote => tradeQuote.activeQuoteMeta)

export const selectActiveSwapperName: Selector<ReduxState, SwapperName | undefined> =
  createSelector(selectActiveQuoteMeta, selectTradeQuotes, (activeQuoteMeta, tradeQuotes) => {
    if (activeQuoteMeta === undefined) return
    // need to ensure a quote exists for the selection
    if (tradeQuotes[activeQuoteMeta.swapperName]?.[activeQuoteMeta.identifier]) {
      return activeQuoteMeta.swapperName
    }
  })

export const selectActiveSwapperApiResponse: Selector<ReduxState, ApiQuote | undefined> =
  createDeepEqualOutputSelector(
    selectTradeQuotes,
    selectActiveQuoteMeta,
    (tradeQuotes, activeQuoteMeta) => {
      // If the active quote was reset, we do NOT want to return a stale quote as an "active" quote
      if (activeQuoteMeta === undefined) return undefined

      return tradeQuotes[activeQuoteMeta.swapperName]?.[activeQuoteMeta.identifier]
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
  ErrorWithMeta<TradeQuoteWarning>[] | undefined
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
    selectQuoteSellAmountCryptoPrecision,
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

export const selectBuyAmountBeforeFeesUserCurrency = createSelector(
  selectBuyAmountBeforeFeesCryptoPrecision,
  selectInputBuyAssetUserCurrencyRate,
  (buyAmountBeforeFeesCryptoPrecision, buyAssetUserCurrencyRate) => {
    if (!buyAmountBeforeFeesCryptoPrecision || !buyAssetUserCurrencyRate) return
    return bn(buyAmountBeforeFeesCryptoPrecision).times(buyAssetUserCurrencyRate).toFixed()
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
  createSelector(selectActiveQuote, activeQuote => {
    if (!activeQuote) return
    return activeQuote.affiliateBps
  })

export const selectQuoteAffiliateFeeUserCurrency = createSelector(
  selectActiveQuote,
  selectQuoteSellAmountUserCurrency,
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

export const selectTradeQuoteDisplayCache = createDeepEqualOutputSelector(
  selectTradeQuoteSlice,
  tradeQuoteSlice => {
    return tradeQuoteSlice.tradeQuoteDisplayCache
  },
)

export const selectIsTradeQuoteRequestAborted = createSelector(
  selectTradeQuoteSlice,
  swappers => swappers.isTradeQuoteRequestAborted,
)
