import { createSelector } from '@reduxjs/toolkit'
import type { Selector } from 'react-redux'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import { selectAccountNumberParamFromFilter, selectChainIdParamFromFilter } from 'state/selectors'

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
// import { selectIsActiveQuoteMultiHop } from '../tradeQuoteSlice/selectors'

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

// if multi-hop, selects the account ID we're selling from for fee asset of the last hop and its account number
// else, selects the AccountId from the first hop
export const selectSecondHopSellAccountId = createSelector(
  selectAccountNumberParamFromFilter,
  selectAccountIdByAccountNumberAndChainId,
  selectChainIdParamFromFilter,
  // selectIsActiveQuoteMultiHop,
  selectFirstHopSellAccountId,
  (
    sellAssetAccountNumber,
    sellAssetAccountIds,
    sellAssetChainId,
    // isMultiHopTrade,
    firstHopSellAccountId,
  ) => {
    // TODO(gomes): fix circular deps here
    const isMultiHopTrade = true
    if (!isMultiHopTrade) return firstHopSellAccountId
    if (sellAssetAccountNumber === undefined) return
    if (!sellAssetChainId) return
    const chainIdAccountNumbers = sellAssetAccountIds[sellAssetAccountNumber]
    return chainIdAccountNumbers?.[sellAssetChainId]
  },
)

// TODO: this isn't true for multi-hops
export const selectLastHopSellAccountId = selectFirstHopSellAccountId

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
