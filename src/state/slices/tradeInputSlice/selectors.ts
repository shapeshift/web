import { createSelector } from '@reduxjs/toolkit'
import { isExecutableTradeStep, type SwapperName, type TradeQuote } from '@shapeshiftoss/swapper'
import type { Selector } from 'react-redux'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'
import type { ApiQuote } from 'state/apis/swapper/types'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'

import { createTradeInputBaseSelectors } from '../common/tradeInputBase/createTradeInputBaseSelectors'
import {
  selectEnabledWalletAccountIds,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
} from '../common-selectors'
import {
  selectAccountIdByAccountNumberAndChainId,
  selectPortfolioAccountMetadata,
  selectPortfolioAssetAccountBalancesSortedUserCurrency,
} from '../portfolioSlice/selectors'
import {
  getFirstAccountIdByChainId,
  getHighestUserCurrencyBalanceAccountByAssetId,
} from '../portfolioSlice/utils'
import { getActiveQuoteMetaOrDefault, sortTradeQuotes } from '../tradeQuoteSlice/helpers'
import type { ActiveQuoteMeta } from '../tradeQuoteSlice/types'

export const {
  selectBaseSlice,
  selectInputBuyAsset,
  selectInputSellAsset,
  selectInputSellAssetUsdRate,
  selectInputBuyAssetUsdRate,
  selectInputSellAssetUserCurrencyRate,
  selectInputBuyAssetUserCurrencyRate,
  selectUserSlippagePercentage,
  selectUserSlippagePercentageDecimal,
} = createTradeInputBaseSelectors('tradeInput')

// selects the account ID we're selling from for the first hop
export const selectFirstHopSellAccountId = createSelector(
  selectBaseSlice,
  selectInputSellAsset,
  selectPortfolioAssetAccountBalancesSortedUserCurrency,
  selectEnabledWalletAccountIds,
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
  selectBaseSlice,
  selectInputBuyAsset,
  selectEnabledWalletAccountIds,
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
  selectBaseSlice,
  tradeInput => tradeInput.sellAmountCryptoPrecision,
)

export const selectInputSellAmountCryptoBaseUnit = createSelector(
  selectInputSellAmountCryptoPrecision,
  selectInputSellAsset,
  (sellAmountCryptoPrecision, sellAsset) =>
    toBaseUnit(sellAmountCryptoPrecision, sellAsset.precision),
)

export const selectManualReceiveAddress = createSelector(
  selectBaseSlice,
  tradeInput => tradeInput.manualReceiveAddress,
)

export const selectManualReceiveAddressIsValidating = createSelector(
  selectBaseSlice,
  tradeInput => tradeInput.manualReceiveAddressIsValidating,
)

export const selectManualReceiveAddressIsEditing = createSelector(
  selectBaseSlice,
  tradeInput => tradeInput.manualReceiveAddressIsEditing,
)

export const selectManualReceiveAddressIsValid = createSelector(
  selectBaseSlice,
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

export const selectSellAssetBalanceCryptoBaseUnit = createSelector(
  (state: ReduxState) =>
    selectPortfolioCryptoBalanceBaseUnitByFilter(state, {
      accountId: selectFirstHopSellAccountId(state),
      assetId: selectInputSellAsset(state).assetId,
    }),
  sellAssetBalanceCryptoBaseUnit => sellAssetBalanceCryptoBaseUnit,
)

export const selectIsInputtingFiatSellAmount = createSelector(
  selectBaseSlice,
  tradeInput => tradeInput.isInputtingFiatSellAmount,
)

export const selectHasUserEnteredAmount = createSelector(
  selectInputSellAmountCryptoPrecision,
  sellAmountCryptoPrecision => bnOrZero(sellAmountCryptoPrecision).gt(0),
)

// All the below selectors are re-declared from tradeQuoteSlice/selectors to avoid circular deps
// and allow selectSecondHopSellAccountId to keep a pwetty API

const selectTradeQuoteSlice = (state: ReduxState) => state.tradeQuoteSlice
const selectActiveQuoteMeta: Selector<ReduxState, ActiveQuoteMeta | undefined> = createSelector(
  selectTradeQuoteSlice,
  tradeQuoteSlice => tradeQuoteSlice.activeQuoteMeta,
)
const selectTradeQuotes = createDeepEqualOutputSelector(
  selectTradeQuoteSlice,
  tradeQuoteSlice => tradeQuoteSlice.tradeQuotes,
)
const selectSortedTradeQuotes = createDeepEqualOutputSelector(selectTradeQuotes, tradeQuotes =>
  sortTradeQuotes(tradeQuotes),
)

const selectActiveQuoteMetaOrDefault: Selector<
  ReduxState,
  { swapperName: SwapperName; identifier: string } | undefined
> = createSelector(selectActiveQuoteMeta, selectSortedTradeQuotes, getActiveQuoteMetaOrDefault)

const selectActiveSwapperApiResponse: Selector<ReduxState, ApiQuote | undefined> =
  createDeepEqualOutputSelector(
    selectTradeQuotes,
    selectActiveQuoteMetaOrDefault,
    (tradeQuotes, activeQuoteMetaOrDefault) => {
      // If the active quote was reset, we do NOT want to return a stale quote as an "active" quote
      if (activeQuoteMetaOrDefault === undefined) return undefined

      return tradeQuotes[activeQuoteMetaOrDefault.swapperName]?.[
        activeQuoteMetaOrDefault.identifier
      ]
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
    if (!isExecutableTradeStep(secondHop)) return

    const secondHopSellAssetAccountNumber = secondHop.accountNumber
    const secondHopSellAssetChainId = secondHop.sellAsset.chainId

    const chainIdAccountNumbers =
      accountIdsByAccountNumberAndChainId[secondHopSellAssetAccountNumber]
    if (!chainIdAccountNumbers) return
    return chainIdAccountNumbers?.[secondHopSellAssetChainId]
  },
)
