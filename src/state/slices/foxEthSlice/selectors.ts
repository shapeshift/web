import { createSelector } from '@reduxjs/toolkit'
import type { AccountId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, ethAssetId, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import keys from 'lodash/keys'
import { createCachedSelector } from 're-reselect'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import { selectAssets } from 'state/slices/assetsSlice/selectors'
import { selectMarketData } from 'state/slices/marketDataSlice/selectors'

import type { AccountSpecifier } from '../accountSpecifiersSlice/accountSpecifiersSlice'
import { foxEthLpAssetId } from './constants'
import type { FoxEthLpEarnOpportunityType } from './foxEthCommon'

// TODO(gomes): DeepEqual Output compareFn
const selectAccountAddressParamFromFilter = (
  _state: ReduxState,
  filter: { accountAddress?: string; contractAddress?: string },
): string => filter?.accountAddress ?? ''

// TODO(gomes): DeepEqual Output compareFn
const selectContractAddressParamFromFilter = (
  _state: ReduxState,
  filter: { accountAddress?: string; contractAddress?: string },
): string => filter?.contractAddress ?? ''

// Copied over from portfolioSlice because circular deps, do not export me
const selectPortfolioAccountIds = createDeepEqualOutputSelector(
  (state: ReduxState): AccountSpecifier[] => state.portfolio.accounts.ids,
  (accountIds): AccountId[] => accountIds,
)
// Copied over from portfolioSlice because circular deps, do not export me
const selectEthAccountIdsByAssetId = createCachedSelector(
  selectPortfolioAccountIds,
  (accountIds): AccountId[] => {
    const { chainId } = fromAssetId(ethAssetId)
    return accountIds.filter(accountId => fromAccountId(accountId).chainId === chainId)
  },
)((_accountIds, paramFilter) => paramFilter?.assetId ?? 'undefined')

export const selectFoxEthLpAccountOpportunitiesByMaybeAccountAddress = createSelector(
  (state: ReduxState) => state.foxEth,
  selectAccountAddressParamFromFilter,
  selectEthAccountIdsByAssetId,
  (foxEthState, accountAddress, ethAccountIds) => {
    const ethAccountAddresses = ethAccountIds.map(accountId => fromAccountId(accountId).account)
    return (accountAddress ? [accountAddress] : ethAccountAddresses).map(
      accountAddress => foxEthState[accountAddress]?.lpOpportunity,
    )
  },
)

export const selectFoxEthLpOpportunityByAccountAddress = createSelector(
  selectFoxEthLpAccountOpportunitiesByMaybeAccountAddress,
  selectAccountAddressParamFromFilter,
  (foxEthAccountOpportunities, accountAddress) =>
    foxEthAccountOpportunities.find(opportunity => opportunity.accountAddress === accountAddress),
)

export const selectFoxEthLpAccountsOpportunitiesAggregated = createSelector(
  selectFoxEthLpAccountOpportunitiesByMaybeAccountAddress,
  wrappedEthLpOpportunities =>
    wrappedEthLpOpportunities.filter(Boolean).reduce((acc, currentOpportunity) => {
      acc = {
        ...currentOpportunity,
        underlyingFoxAmount: bnOrZero(acc.underlyingFoxAmount)
          .plus(currentOpportunity.underlyingFoxAmount ?? '')
          .toString(),
        underlyingEthAmount: bnOrZero(acc.underlyingEthAmount)
          .plus(currentOpportunity.underlyingEthAmount ?? '')
          .toString(),
        cryptoAmount: bnOrZero(acc.cryptoAmount)
          .plus(currentOpportunity.cryptoAmount ?? '')
          .toString(),
        fiatAmount: bnOrZero(acc.fiatAmount)
          .plus(currentOpportunity.fiatAmount ?? '')
          .toString(),
      }
      return acc
    }, {} as FoxEthLpEarnOpportunityType),
)

export const selectFoxFarmingOpportunitiesByAccountAddress = createSelector(
  (state: ReduxState) => state.foxEth,
  selectAccountAddressParamFromFilter,
  (foxEthState, accountAddress) => foxEthState[accountAddress]?.farmingOpportunities ?? [],
)

export const selectVisibleFoxFarmingOpportunities = createDeepEqualOutputSelector(
  selectFoxFarmingOpportunitiesByAccountAddress,
  opportunities => {
    return opportunities.filter(
      opportunity =>
        !opportunity.expired || (opportunity.expired && bnOrZero(opportunity.cryptoAmount).gt(0)),
    )
  },
)

export const selectFoxFarmingOpportunityByContractAddress = createSelector(
  selectFoxFarmingOpportunitiesByAccountAddress,
  selectContractAddressParamFromFilter,
  (opportunities, contractAddress) =>
    opportunities.find(opportunity => opportunity.contractAddress === contractAddress),
)

export const selectFarmContractsBalance = createSelector(
  selectFoxFarmingOpportunitiesByAccountAddress,
  (farmingOpportunities): string => {
    const foxFarmingTotalCryptoAmount = (farmingOpportunities ?? []).reduce(
      (totalBalance, opportunity) => totalBalance.plus(bnOrZero(opportunity.cryptoAmount)),
      bnOrZero(0),
    )
    return foxFarmingTotalCryptoAmount.toString()
  },
)

export const selectLpPlusFarmContractsBaseUnitBalance = createSelector(
  selectAssets,
  selectFoxEthLpAccountsOpportunitiesAggregated,
  selectFarmContractsBalance,
  (assetsById, lpOpportunity, farmContractsBalance) => {
    const lpAsset = assetsById[foxEthLpAssetId]
    return toBaseUnit(
      bnOrZero(lpOpportunity?.cryptoAmount).plus(bnOrZero(farmContractsBalance)),
      // src/state/reselect-tools.test.ts fails saying lpAsset is undefined
      lpAsset?.precision ?? 0,
    )
  },
)

// Redeclared here because of circular deps
const selectPortfolioAccounts = (state: ReduxState) => state.portfolio.accounts.byId

export const selectFoxEthLpFiatBalance = createSelector(
  selectMarketData,
  selectPortfolioAccounts,
  (state: ReduxState) => state.foxEth,
  (marketData, portfolioAccounts, foxEthState) => {
    // Cannot use selectAccountIdsByAssetId because of a. circular deps and b. it applying balance threshold
    const accountIds = keys(portfolioAccounts).filter(
      accountId => fromAccountId(accountId).chainNamespace === CHAIN_NAMESPACE.Evm,
    )
    const accountAddresses = accountIds.map(accountId => fromAccountId(accountId).account)
    const lpOpportunities = accountAddresses
      .map(accountAddress => foxEthState[accountAddress]?.lpOpportunity)
      .filter(Boolean)

    const lpTokenPrice = marketData[foxEthLpAssetId]?.price ?? 0
    const lpOpportunitiesCryptoAmount = lpOpportunities.reduce((acc, currentLpOpportunity) => {
      acc = acc.plus(currentLpOpportunity?.cryptoAmount ?? 0)

      return acc
    }, bn(0))
    return bnOrZero(lpOpportunitiesCryptoAmount).times(lpTokenPrice).toFixed(2)
  },
)

export const selectFarmContractsFiatBalance = createSelector(
  selectMarketData,
  selectFarmContractsBalance,
  (marketData, foxFarmingTotalCryptoAmount) => {
    const lpTokenPrice = marketData[foxEthLpAssetId]?.price ?? 0
    return bnOrZero(foxFarmingTotalCryptoAmount).times(lpTokenPrice).toFixed(2)
  },
)
