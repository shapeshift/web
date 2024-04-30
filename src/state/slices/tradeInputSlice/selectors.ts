import { createSelector } from '@reduxjs/toolkit'
import type { SwapperName, TradeQuote } from '@shapeshiftoss/swapper'
import type { Selector } from 'react-redux'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'
import { isSome } from 'lib/utils'
import type { ApiQuote } from 'state/apis/swapper/types'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'

import {
  selectPortfolioCryptoBalanceBaseUnitByFilter,
  selectWalletAccountIds,
} from '../common-selectors'
import { selectMarketDataUsd, selectUserCurrencyToUsdRate } from '../marketDataSlice/selectors'
import {
  selectAccountIdByAccountNumberAndChainId,
  selectPortfolioAccountMetadata,
  selectPortfolioAssetAccountBalancesSortedUserCurrency,
} from '../portfolioSlice/selectors'
import {
  getFirstAccountIdByChainId,
  getHighestUserCurrencyBalanceAccountByAssetId,
} from '../portfolioSlice/utils'
import { sortQuotes } from '../tradeQuoteSlice/helpers'

const selectTradeInput = (state: ReduxState) => state.tradeInput

export const selectInputBuyAsset = createDeepEqualOutputSelector(
  selectTradeInput,
  tradeInput => tradeInput.buyAsset,
)

export const selectInputSellAsset = createDeepEqualOutputSelector(
  selectTradeInput,
  tradeInput => tradeInput.sellAsset,
)

export const selectInputSellAssetUsdRate = createSelector(
  selectInputSellAsset,
  selectMarketDataUsd,
  (sellAsset, marketDataUsd) => {
    if (sellAsset === undefined) return
    return marketDataUsd[sellAsset.assetId]?.price
  },
)

export const selectInputBuyAssetUsdRate = createSelector(
  selectInputBuyAsset,
  selectMarketDataUsd,
  (buyAsset, marketDataUsd) => {
    if (buyAsset === undefined) return
    return marketDataUsd[buyAsset.assetId]?.price
  },
)

export const selectInputSellAssetUserCurrencyRate = createSelector(
  selectInputSellAssetUsdRate,
  selectUserCurrencyToUsdRate,
  (sellAssetUsdRate, userCurrencyToUsdRate) => {
    if (sellAssetUsdRate === undefined) return
    return bn(sellAssetUsdRate).times(userCurrencyToUsdRate).toString()
  },
)

export const selectInputBuyAssetUserCurrencyRate = createSelector(
  selectInputBuyAssetUsdRate,
  selectUserCurrencyToUsdRate,
  (buyAssetUsdRate, userCurrencyToUsdRate) => {
    if (buyAssetUsdRate === undefined) return
    return bn(buyAssetUsdRate).times(userCurrencyToUsdRate).toString()
  },
)

export const selectUserSlippagePercentage: Selector<ReduxState, string | undefined> =
  createSelector(selectTradeInput, tradeInput => tradeInput.slippagePreferencePercentage)

// User input comes in as an actual percentage e.g 1 for 1%, so we need to convert it to a decimal e.g 0.01 for 1%
export const selectUserSlippagePercentageDecimal: Selector<ReduxState, string | undefined> =
  createSelector(selectUserSlippagePercentage, slippagePercentage => {
    if (!slippagePercentage) return
    return bn(slippagePercentage).div(100).toString()
  })

// selects the account ID we're selling from for the first hop
export const selectFirstHopSellAccountId = createSelector(
  selectTradeInput,
  selectInputSellAsset,
  selectPortfolioAssetAccountBalancesSortedUserCurrency,
  selectWalletAccountIds,
  (tradeInput, sellAsset, accountIdAssetValues, accountIds) => {
    // return the users selection if it exists
    if (tradeInput.sellAssetAccountId) return tradeInput.sellAssetAccountId

    const highestFiatBalanceSellAccountId = getHighestUserCurrencyBalanceAccountByAssetId(
      accountIdAssetValues,
      sellAsset.assetId,
    )
    const firstSellAssetAccountId = getFirstAccountIdByChainId(accountIds, sellAsset.chainId)

    // otherwise return a sane default
    return highestFiatBalanceSellAccountId ?? firstSellAssetAccountId
  },
)

// selects the account ID we're buying into for the last hop
export const selectLastHopBuyAccountId = createSelector(
  selectTradeInput,
  selectInputBuyAsset,
  selectWalletAccountIds,
  selectAccountIdByAccountNumberAndChainId,
  selectFirstHopSellAccountId,
  selectPortfolioAccountMetadata,
  (
    tradeInput,
    buyAsset,
    accountIds,
    accountIdByAccountNumberAndChainId,
    firstHopSellAccountId,
    accountMetadata,
  ) => {
    // return the users selection if it exists
    if (tradeInput.buyAssetAccountId) {
      return tradeInput.buyAssetAccountId
    }

    // maybe convert the account id to an account number
    const maybeMatchingBuyAccountNumber = firstHopSellAccountId
      ? accountMetadata[firstHopSellAccountId]?.bip44Params.accountNumber
      : undefined

    // maybe convert account number to account id on the buy asset chain
    const maybeMatchingBuyAccountId = maybeMatchingBuyAccountNumber
      ? accountIdByAccountNumberAndChainId[maybeMatchingBuyAccountNumber]?.[buyAsset.chainId]
      : undefined

    // an AccountId was found matching the sell asset's account number and chainId, return it
    if (maybeMatchingBuyAccountId) {
      return maybeMatchingBuyAccountId
    }

    // otherwise return a sane default
    return getFirstAccountIdByChainId(accountIds, buyAsset.chainId)
  },
)

export const selectInputSellAmountCryptoPrecision = createSelector(
  selectTradeInput,
  tradeInput => tradeInput.sellAmountCryptoPrecision,
)

export const selectInputSellAmountCryptoBaseUnit = createSelector(
  selectInputSellAmountCryptoPrecision,
  selectInputSellAsset,
  (sellAmountCryptoPrecision, sellAsset) =>
    toBaseUnit(sellAmountCryptoPrecision, sellAsset.precision),
)

export const selectManualReceiveAddress = createSelector(
  selectTradeInput,
  tradeInput => tradeInput.manualReceiveAddress,
)

export const selectManualReceiveAddressIsValidating = createSelector(
  selectTradeInput,
  tradeInput => tradeInput.manualReceiveAddressIsValidating,
)

export const selectManualReceiveAddressIsEditing = createSelector(
  selectTradeInput,
  tradeInput => tradeInput.manualReceiveAddressIsEditing,
)

export const selectManualReceiveAddressIsValid = createSelector(
  selectTradeInput,
  tradeInput => tradeInput.manualReceiveAddressIsValid,
)

export const selectInputSellAmountUsd = createSelector(
  selectInputSellAmountCryptoPrecision,
  selectInputSellAssetUsdRate,
  (sellAmountCryptoPrecision, sellAssetUsdRate) => {
    if (!sellAssetUsdRate) return
    return bn(sellAmountCryptoPrecision).times(sellAssetUsdRate).toFixed()
  },
)

export const selectInputSellAmountUserCurrency = createSelector(
  selectInputSellAmountCryptoPrecision,
  selectInputSellAssetUserCurrencyRate,
  (sellAmountCryptoPrecision, sellAssetUserCurrencyRate) => {
    if (!sellAssetUserCurrencyRate) return
    return bn(sellAmountCryptoPrecision).times(sellAssetUserCurrencyRate).toFixed()
  },
)

export const selectSellAssetBalanceFilter = createSelector(
  selectFirstHopSellAccountId,
  selectInputSellAsset,
  (firstHopSellAccountId, sellAsset) => {
    return {
      accountId: firstHopSellAccountId,
      assetId: sellAsset.assetId,
    }
  },
)

export const selectSellAssetBalanceCryptoBaseUnit = createSelector(
  (state: ReduxState) =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, {
      accountId: selectFirstHopSellAccountId(state),
      assetId: selectInputSellAsset(state).assetId,
    }),
  sellAssetBalanceCryptoBaseUnit => sellAssetBalanceCryptoBaseUnit,
)

export const selectIsInputtingFiatSellAmount = createSelector(
  selectTradeInput,
  tradeInput => tradeInput.isInputtingFiatSellAmount,
)

export const selectHasUserEnteredAmount = createSelector(
  selectInputSellAmountCryptoPrecision,
  sellAmountCryptoPrecision => bnOrZero(sellAmountCryptoPrecision).gt(0),
)

// All the below selectors are re-declared from tradeQuoteSlice/selectors to avoid circular deps
// and allow selectSecondHopSellAccountId to keep a pwetty API

const selectTradeQuoteSlice = (state: ReduxState) => state.tradeQuoteSlice
const selectTradeQuotes = createDeepEqualOutputSelector(
  selectTradeQuoteSlice,
  tradeQuoteSlice => tradeQuoteSlice.tradeQuotes,
)
const selectSortedTradeQuotes = createDeepEqualOutputSelector(selectTradeQuotes, tradeQuotes => {
  const allQuotes = Object.values(tradeQuotes)
    .filter(isSome)
    .map(swapperQuotes => Object.values(swapperQuotes))
    .flat()
  const happyQuotes = sortQuotes(allQuotes.filter(({ errors }) => errors.length === 0))
  const errorQuotes = sortQuotes(allQuotes.filter(({ errors }) => errors.length > 0))
  return [...happyQuotes, ...errorQuotes]
})

const selectActiveQuoteMeta: Selector<
  ReduxState,
  { swapperName: SwapperName; identifier: string } | undefined
> = createSelector(
  selectTradeQuoteSlice,
  selectSortedTradeQuotes,
  (tradeQuoteSlice, sortedQuotes) => {
    const bestQuote = sortedQuotes[0]
    const bestQuoteMeta = bestQuote
      ? { swapperName: bestQuote.swapperName, identifier: bestQuote.id }
      : undefined
    // Return the "best" quote even if it has errors, provided there is a quote to display data for
    // this allows users to explore trades that aren't necessarily actionable. The UI will prevent
    // executing these downstream.
    const isSelectable = bestQuote?.quote !== undefined
    const defaultQuoteMeta = isSelectable ? bestQuoteMeta : undefined
    return tradeQuoteSlice.activeQuoteMeta ?? defaultQuoteMeta
  },
)

const selectActiveSwapperApiResponse: Selector<ReduxState, ApiQuote | undefined> =
  createDeepEqualOutputSelector(
    selectTradeQuotes,
    selectActiveQuoteMeta,
    (tradeQuotes, activeQuoteMeta) => {
      // If the active quote was reset, we do NOT want to return a stale quote as an "active" quote
      if (activeQuoteMeta === undefined) return undefined

      return tradeQuotes[activeQuoteMeta.swapperName]?.[activeQuoteMeta.identifier]
    },
  )
const selectConfirmedQuote: Selector<ReduxState, TradeQuote | undefined> =
  createDeepEqualOutputSelector(selectTradeQuoteSlice, tradeQuote => tradeQuote.confirmedQuote)
const selectActiveQuote: Selector<ReduxState, TradeQuote | undefined> =
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

const selectSecondHop: Selector<ReduxState, TradeQuote['steps'][number] | undefined> =
  createDeepEqualOutputSelector(selectActiveQuote, quote => (quote ? quote.steps[1] : undefined))

export const selectIsActiveQuoteMultiHop: Selector<ReduxState, boolean | undefined> =
  createSelector(selectActiveQuote, quote => (quote ? quote?.steps.length > 1 : undefined))

// if multi-hop, selects the account ID we're selling from for fee asset of the last hop and its account number
// else, selects none because there's obviously no AccountId if there's no hop
export const selectSecondHopSellAccountId = createSelector(
  selectAccountIdByAccountNumberAndChainId,
  selectIsActiveQuoteMultiHop,
  selectSecondHop,
  (accountIdsByAccountNumberAndChainId, isMultiHopTrade, secondHop) => {
    // No second hop sellAccountId if there is no second hop
    if (!isMultiHopTrade || !secondHop) return
    const secondHopSellAssetAccountNumber = secondHop.accountNumber
    const secondHopSellAssetChainId = secondHop.sellAsset.chainId

    const chainIdAccountNumbers =
      accountIdsByAccountNumberAndChainId[secondHopSellAssetAccountNumber]
    if (!chainIdAccountNumbers) return
    return chainIdAccountNumbers?.[secondHopSellAssetChainId]
  },
)
