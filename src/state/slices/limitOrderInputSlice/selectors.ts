import { createSelector } from '@reduxjs/toolkit'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'
import type { ReduxState } from 'state/reducer'

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

// Shared selectors from the base trade input slice that handle common functionality like input
// assets, rates, and slippage preferences
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
} = createTradeInputBaseSelectors('limitOrderInput')

// selects the account ID we're selling from for the first hop
export const selectFirstHopSellAccountId = createSelector(
  selectBaseSlice,
  selectInputSellAsset,
  selectPortfolioAssetAccountBalancesSortedUserCurrency,
  selectEnabledWalletAccountIds,
  (baseSlice, sellAsset, accountIdAssetValues, accountIds) => {
    // return the users selection if it exists
    if (baseSlice.sellAssetAccountId) return baseSlice.sellAssetAccountId

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
    baseSlice,
    buyAsset,
    accountIds,
    accountIdByAccountNumberAndChainId,
    firstHopSellAccountId,
    accountMetadata,
  ) => {
    // return the users selection if it exists
    if (baseSlice.buyAssetAccountId) {
      return baseSlice.buyAssetAccountId
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
  baseSlice => baseSlice.sellAmountCryptoPrecision,
)

export const selectInputSellAmountCryptoBaseUnit = createSelector(
  selectInputSellAmountCryptoPrecision,
  selectInputSellAsset,
  (sellAmountCryptoPrecision, sellAsset) =>
    toBaseUnit(sellAmountCryptoPrecision, sellAsset.precision),
)

export const selectManualReceiveAddress = createSelector(
  selectBaseSlice,
  baseSlice => baseSlice.manualReceiveAddress,
)

export const selectManualReceiveAddressIsValidating = createSelector(
  selectBaseSlice,
  baseSlice => baseSlice.manualReceiveAddressIsValidating,
)

export const selectManualReceiveAddressIsEditing = createSelector(
  selectBaseSlice,
  baseSlice => baseSlice.manualReceiveAddressIsEditing,
)

export const selectManualReceiveAddressIsValid = createSelector(
  selectBaseSlice,
  baseSlice => baseSlice.manualReceiveAddressIsValid,
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
  baseSlice => baseSlice.isInputtingFiatSellAmount,
)

export const selectHasUserEnteredAmount = createSelector(
  selectInputSellAmountCryptoPrecision,
  sellAmountCryptoPrecision => bnOrZero(sellAmountCryptoPrecision).gt(0),
)
