import { createSelector } from '@reduxjs/toolkit'
import { bn, bnOrZero, toBaseUnit } from '@shapeshiftoss/utils'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'

import {
  selectEnabledWalletAccountIds,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
} from '../../common-selectors'
import { selectMarketDataUsd, selectUserCurrencyToUsdRate } from '../../marketDataSlice/selectors'
import {
  selectAccountIdByAccountNumberAndChainId,
  selectPortfolioAccountMetadata,
  selectPortfolioAssetAccountBalancesSortedUserCurrency,
} from '../../portfolioSlice/selectors'
import {
  getFirstAccountIdByChainId,
  getHighestUserCurrencyBalanceAccountByAssetId,
} from '../../portfolioSlice/utils'
import type { TradeInputBaseState } from './createTradeInputBaseSlice'

/**
 * Creates a set of reusable Redux selectors for trade input functionality. This is a higher-order
 * selector factory that generates selectors for any slice that handles trade inputs. It provides
 * selectors for common trade-related data like buy/sell assets, exchange rates, and slippage
 * preferences. This allows multiple features (like trading and limit orders) to reuse the same
 * selector logic while maintaining their own independent state.
 *
 * @param sliceName - The name of the Redux slice to create selectors for
 * @returns An object containing all the generated selectors
 */
export const createTradeInputBaseSelectors = (sliceName: keyof ReduxState) => {
  // Base selector to get the slice
  const selectBaseSlice = (state: ReduxState) => state[sliceName] as TradeInputBaseState

  // Create reusable selectors
  const selectInputBuyAsset = createDeepEqualOutputSelector(
    selectBaseSlice,
    tradeInput => tradeInput.buyAsset,
  )

  const selectInputSellAsset = createDeepEqualOutputSelector(
    selectBaseSlice,
    tradeInput => tradeInput.sellAsset,
  )

  const selectInputSellAssetUsdRate = createSelector(
    selectInputSellAsset,
    selectMarketDataUsd,
    (sellAsset, marketDataUsd) => {
      if (sellAsset === undefined) return
      return marketDataUsd[sellAsset.assetId]?.price
    },
  )

  const selectInputBuyAssetUsdRate = createSelector(
    selectInputBuyAsset,
    selectMarketDataUsd,
    (buyAsset, marketDataUsd) => {
      if (buyAsset === undefined) return
      return marketDataUsd[buyAsset.assetId]?.price
    },
  )

  const selectInputSellAssetUserCurrencyRate = createSelector(
    selectInputSellAssetUsdRate,
    selectUserCurrencyToUsdRate,
    (sellAssetUsdRate, userCurrencyToUsdRate) => {
      if (sellAssetUsdRate === undefined) return
      return bn(sellAssetUsdRate).times(userCurrencyToUsdRate).toString()
    },
  )

  const selectInputBuyAssetUserCurrencyRate = createSelector(
    selectInputBuyAssetUsdRate,
    selectUserCurrencyToUsdRate,
    (buyAssetUsdRate, userCurrencyToUsdRate) => {
      if (buyAssetUsdRate === undefined) return
      return bn(buyAssetUsdRate).times(userCurrencyToUsdRate).toString()
    },
  )

  const selectUserSlippagePercentage = createSelector(
    selectBaseSlice,
    tradeInput => tradeInput.slippagePreferencePercentage,
  )

  // User input comes in as an actual percentage e.g 1 for 1%, so we need to convert it to a decimal e.g 0.01 for 1%
  const selectUserSlippagePercentageDecimal = createSelector(
    selectUserSlippagePercentage,
    slippagePercentage => {
      if (!slippagePercentage) return
      return bn(slippagePercentage).div(100).toString()
    },
  )

  // selects the account ID we're selling from
  const selectSellAccountId = createSelector(
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

  // selects the account ID we're buying into
  const selectBuyAccountId = createSelector(
    selectBaseSlice,
    selectInputBuyAsset,
    selectEnabledWalletAccountIds,
    selectAccountIdByAccountNumberAndChainId,
    selectSellAccountId,
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

  const selectInputSellAmountCryptoPrecision = createSelector(
    selectBaseSlice,
    baseSlice => baseSlice.sellAmountCryptoPrecision,
  )

  const selectInputSellAmountCryptoBaseUnit = createSelector(
    selectInputSellAmountCryptoPrecision,
    selectInputSellAsset,
    (sellAmountCryptoPrecision, sellAsset) =>
      toBaseUnit(sellAmountCryptoPrecision, sellAsset.precision),
  )

  const selectManualReceiveAddress = createSelector(
    selectBaseSlice,
    baseSlice => baseSlice.manualReceiveAddress,
  )

  const selectManualReceiveAddressIsValidating = createSelector(
    selectBaseSlice,
    baseSlice => baseSlice.manualReceiveAddressIsValidating,
  )

  const selectManualReceiveAddressIsEditing = createSelector(
    selectBaseSlice,
    baseSlice => baseSlice.manualReceiveAddressIsEditing,
  )

  const selectManualReceiveAddressIsValid = createSelector(
    selectBaseSlice,
    baseSlice => baseSlice.manualReceiveAddressIsValid,
  )

  const selectInputSellAmountUsd = createSelector(
    selectInputSellAmountCryptoPrecision,
    selectInputSellAssetUsdRate,
    (sellAmountCryptoPrecision, sellAssetUsdRate) => {
      if (!sellAssetUsdRate) return
      return bn(sellAmountCryptoPrecision).times(sellAssetUsdRate).toFixed()
    },
  )

  const selectInputSellAmountUserCurrency = createSelector(
    selectInputSellAmountCryptoPrecision,
    selectInputSellAssetUserCurrencyRate,
    (sellAmountCryptoPrecision, sellAssetUserCurrencyRate) => {
      if (!sellAssetUserCurrencyRate) return
      return bn(sellAmountCryptoPrecision).times(sellAssetUserCurrencyRate).toFixed()
    },
  )

  const selectSellAssetBalanceCryptoBaseUnit = createSelector(
    (state: ReduxState) =>
      selectPortfolioCryptoBalanceBaseUnitByFilter(state, {
        accountId: selectSellAccountId(state),
        assetId: selectInputSellAsset(state).assetId,
      }),
    sellAssetBalanceCryptoBaseUnit => sellAssetBalanceCryptoBaseUnit,
  )

  const selectIsInputtingFiatSellAmount = createSelector(
    selectBaseSlice,
    baseSlice => baseSlice.isInputtingFiatSellAmount,
  )

  const selectHasUserEnteredAmount = createSelector(
    selectInputSellAmountCryptoPrecision,
    sellAmountCryptoPrecision => bnOrZero(sellAmountCryptoPrecision).gt(0),
  )

  return {
    selectBaseSlice,
    selectInputBuyAsset,
    selectInputSellAsset,
    selectInputSellAssetUsdRate,
    selectInputBuyAssetUsdRate,
    selectInputSellAssetUserCurrencyRate,
    selectInputBuyAssetUserCurrencyRate,
    selectUserSlippagePercentage,
    selectUserSlippagePercentageDecimal,
    selectSellAccountId,
    selectBuyAccountId,
    selectInputSellAmountCryptoBaseUnit,
    selectManualReceiveAddress,
    selectManualReceiveAddressIsValidating,
    selectManualReceiveAddressIsEditing,
    selectManualReceiveAddressIsValid,
    selectInputSellAmountUsd,
    selectInputSellAmountUserCurrency,
    selectSellAssetBalanceCryptoBaseUnit,
    selectIsInputtingFiatSellAmount,
    selectHasUserEnteredAmount,
    selectInputSellAmountCryptoPrecision,
  }
}
