import { createSelector } from '@reduxjs/toolkit'
import { CHAIN_NAMESPACE, fromAccountId } from '@shapeshiftoss/caip'
import keys from 'lodash/keys'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import { selectAssets } from 'state/slices/assetsSlice/selectors'
import { selectMarketData } from 'state/slices/marketDataSlice/selectors'

import { foxEthLpAssetId } from './constants'

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

export const selectFoxEthLpOpportunityByAccountAddress = createSelector(
  (state: ReduxState) => state.foxEth,
  selectAccountAddressParamFromFilter,
  (foxEthState, accountAddress) => {
    return foxEthState[accountAddress]?.lpOpportunity
  },
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
  selectFoxEthLpOpportunityByAccountAddress,
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
