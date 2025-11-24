import { createSelector } from '@reduxjs/toolkit'
import { bn, bnOrZero, toBaseUnit } from '@shapeshiftoss/utils'

import {
  selectEnabledWalletAccountIds,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
} from '../../common-selectors'
import { marketData } from '../../marketDataSlice/marketDataSlice'
import { selectUserCurrencyToUsdRate } from '../../marketDataSlice/selectors'
import {
  selectAccountIdsByAccountNumberAndChainId,
  selectPortfolioAccountMetadata,
  selectPortfolioAssetAccountBalancesSortedUserCurrency,
} from '../../portfolioSlice/selectors'
import {
  getFirstAccountIdByChainId,
  getHighestUserCurrencyBalanceAccountByAssetId,
} from '../../portfolioSlice/utils'
import type { TradeInputBaseState } from './createTradeInputBaseSlice'

import type { ReduxState } from '@/state/reducer'
import { createDeepEqualOutputSelector } from '@/state/selector-utils'

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
export const createTradeInputBaseSelectors = <T extends TradeInputBaseState>(
  sliceName: keyof ReduxState,
) => {
  // Base selector to get the slice
  const selectBaseSlice = (state: ReduxState) => state[sliceName] as unknown as T

  // Create reusable selectors
  const selectInputBuyAsset = createDeepEqualOutputSelector(
    selectBaseSlice,
    tradeInput => tradeInput.buyAsset,
  )

  const selectInputSellAsset = createDeepEqualOutputSelector(
    selectBaseSlice,
    tradeInput => tradeInput.sellAsset,
  )

  const selectSelectedSellAssetChainId = createSelector(
    selectBaseSlice,
    tradeInput => tradeInput.selectedSellAssetChainId,
  )

  const selectSelectedBuyAssetChainId = createSelector(
    selectBaseSlice,
    tradeInput => tradeInput.selectedBuyAssetChainId,
  )

  const selectInputSellAssetUsdRate = createSelector(
    selectInputSellAsset,
    marketData.selectors.selectMarketDataUsd,
    (sellAsset, marketDataUsd) => {
      if (sellAsset === undefined) return
      return marketDataUsd[sellAsset.assetId]?.price
    },
  )

  const selectInputBuyAssetUsdRate = createSelector(
    selectInputBuyAsset,
    marketData.selectors.selectMarketDataUsd,
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

  // selects the account ID we're selling from
  const selectSellAccountId = createSelector(
    selectBaseSlice,
    selectInputSellAsset,
    selectPortfolioAssetAccountBalancesSortedUserCurrency,
    selectEnabledWalletAccountIds,
    (baseSlice, sellAsset, accountIdAssetValues, accountIds) => {
      // return the users selection if it exists
      if (baseSlice.sellAccountId) return baseSlice.sellAccountId

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
    selectAccountIdsByAccountNumberAndChainId,
    selectSellAccountId,
    selectPortfolioAccountMetadata,
    selectPortfolioAssetAccountBalancesSortedUserCurrency,
    (
      baseSlice,
      buyAsset,
      accountIds,
      accountIdsByAccountNumberAndChainId,
      firstHopSellAccountId,
      accountMetadata,
      accountIdAssetValues,
    ) => {
      // return the users selection if it exists
      if (baseSlice.buyAccountId) {
        return baseSlice.buyAccountId
      }

      // maybe convert the account id to an account number
      const maybeMatchingBuyAccountNumber = firstHopSellAccountId
        ? accountMetadata[firstHopSellAccountId]?.bip44Params.accountNumber
        : undefined

      // Get all account IDs for the matching account number on buy chain
      const matchingAccountIds =
        maybeMatchingBuyAccountNumber !== undefined
          ? accountIdsByAccountNumberAndChainId[maybeMatchingBuyAccountNumber]?.[
              buyAsset.chainId
            ] ?? []
          : []

      // If we have matching accounts, pick the one with highest balance
      if (matchingAccountIds.length > 0) {
        const highestBalanceMatchingAccount = matchingAccountIds.reduce((highest, accountId) => {
          const currentBalance = accountIdAssetValues[accountId]?.[buyAsset.assetId] ?? '0'
          const highestBalance = accountIdAssetValues[highest]?.[buyAsset.assetId] ?? '0'
          return bnOrZero(currentBalance).gt(bnOrZero(highestBalance)) ? accountId : highest
        }, matchingAccountIds[0])

        return highestBalanceMatchingAccount
      }

      // Otherwise return a sane default
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

  const selectIsManualReceiveAddressValidating = createSelector(
    selectBaseSlice,
    baseSlice => baseSlice.isManualReceiveAddressValidating,
  )

  const selectIsManualReceiveAddressEditing = createSelector(
    selectBaseSlice,
    baseSlice => baseSlice.isManualReceiveAddressEditing,
  )

  const selectIsManualReceiveAddressValid = createSelector(
    selectBaseSlice,
    baseSlice => baseSlice.isManualReceiveAddressValid,
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
      if (!sellAmountCryptoPrecision) return ''
      return bn(sellAmountCryptoPrecision).times(sellAssetUserCurrencyRate).toString()
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
    selectSellAccountId,
    selectBuyAccountId,
    selectInputSellAmountCryptoBaseUnit,
    selectManualReceiveAddress,
    selectIsManualReceiveAddressValidating,
    selectIsManualReceiveAddressEditing,
    selectIsManualReceiveAddressValid,
    selectInputSellAmountUsd,
    selectInputSellAmountUserCurrency,
    selectSellAssetBalanceCryptoBaseUnit,
    selectIsInputtingFiatSellAmount,
    selectHasUserEnteredAmount,
    selectInputSellAmountCryptoPrecision,
    selectSelectedSellAssetChainId,
    selectSelectedBuyAssetChainId,
  }
}
