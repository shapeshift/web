import { createSelector } from '@reduxjs/toolkit'
import type { AccountId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, ethAssetId, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import keys from 'lodash/keys'
import { createCachedSelector } from 're-reselect'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'
import { isDefined } from 'lib/utils'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import { selectAccountAddressParamFromFilter } from 'state/selectors'
import { selectAssets } from 'state/slices/assetsSlice/selectors'
import { selectMarketData } from 'state/slices/marketDataSlice/selectors'

import { foxEthLpAssetId } from './constants'
import type { FoxEthLpEarnOpportunityType, FoxFarmingEarnOpportunityType } from './foxEthCommon'
import { baseLpOpportunity } from './foxEthCommon'

const farmingOpportunitiesReducer = (
  acc: Record<string, FoxFarmingEarnOpportunityType>,
  opportunity: FoxFarmingEarnOpportunityType,
) => {
  if (!acc[opportunity.contractAddress]) {
    acc[opportunity.contractAddress] = opportunity
  }
  acc[opportunity.contractAddress] = {
    ...(acc[opportunity.contractAddress] ?? {}),
    cryptoAmount: bnOrZero(acc[opportunity.contractAddress]?.cryptoAmount)
      .plus(bnOrZero(opportunity.cryptoAmount))
      .toString(),
    fiatAmount: bnOrZero(acc[opportunity.contractAddress]?.fiatAmount)
      .plus(bnOrZero(opportunity.fiatAmount))
      .toString(),
    unclaimedRewards: bnOrZero(acc[opportunity.contractAddress]?.unclaimedRewards)
      .plus(bnOrZero(opportunity.unclaimedRewards))
      .toString(),
  }

  return acc
}

const selectContractAddressParamFromFilter = (
  _state: ReduxState,
  filter: { accountAddress?: string; contractAddress?: string },
): string => filter?.contractAddress ?? ''

// Copied over from portfolioSlice because circular deps, do not export me
const selectPortfolioAccountIds = createDeepEqualOutputSelector(
  (state: ReduxState): AccountId[] => state.portfolio.accounts.ids,
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

export const selectFoxEthLpAccountOpportunitiesByMaybeAccountAddress = createCachedSelector(
  // TODO(0xdef1cafe): this causes 200+ renders, we can't react on the entire slice changing!
  (state: ReduxState) => state.foxEth,
  selectAccountAddressParamFromFilter,
  selectEthAccountIdsByAssetId,
  (foxEthState, accountAddress, ethAccountIds): FoxEthLpEarnOpportunityType[] => {
    const ethAccountAddresses = ethAccountIds.map(accountId => fromAccountId(accountId).account)
    return (accountAddress ? [accountAddress] : ethAccountAddresses)
      .map(accountAddress => foxEthState[accountAddress]?.lpOpportunity)
      .filter(isDefined)
  },
)((_s: ReduxState, filter) => filter?.accountAddress ?? 'accountAddress')

export const selectFoxEthLpOpportunityByAccountAddress = createSelector(
  selectFoxEthLpAccountOpportunitiesByMaybeAccountAddress,
  foxEthAccountOpportunities => foxEthAccountOpportunities[0],
)

// Aggregated multi-account opportunities, and slaps the highest balance accountAddress in
export const selectFoxEthLpAccountsOpportunitiesAggregated = createDeepEqualOutputSelector(
  selectFoxEthLpAccountOpportunitiesByMaybeAccountAddress,
  (state: ReduxState) => state,
  (wrappedEthLpOpportunities, state): FoxEthLpEarnOpportunityType => {
    const aggregatedOpportunity = wrappedEthLpOpportunities.reduce<
      Partial<FoxEthLpEarnOpportunityType | undefined>
    >(
      (acc, currentOpportunity) => ({
        ...currentOpportunity,
        underlyingFoxAmount: bnOrZero(acc?.underlyingFoxAmount)
          .plus(currentOpportunity?.underlyingFoxAmount ?? '')
          .toString(),
        underlyingEthAmount: bnOrZero(acc?.underlyingEthAmount)
          .plus(currentOpportunity?.underlyingEthAmount ?? '')
          .toString(),
        cryptoAmount: bnOrZero(acc?.cryptoAmount)
          .plus(currentOpportunity?.cryptoAmount ?? '')
          .toString(),
        fiatAmount: bnOrZero(acc?.fiatAmount)
          .plus(currentOpportunity?.fiatAmount ?? '')
          .toString(),
      }),
      undefined,
    )

    const highestBalanceAccountAddress = selectHighestBalanceFoxLpOpportunityAccountAddress(
      state,
      {},
    )

    return {
      ...baseLpOpportunity,
      ...aggregatedOpportunity,
      highestBalanceAccountAddress,
    }
  },
)

export const selectFoxFarmingOpportunitiesByMaybeAccountAddress = createDeepEqualOutputSelector(
  // TODO(0xdef1cafe): this causes 200+ renders, we can't react on the entire slice changing!
  (state: ReduxState) => state.foxEth,
  selectAccountAddressParamFromFilter,
  selectEthAccountIdsByAssetId,
  (foxEthState, accountAddress, ethAccountIds) => {
    const ethAccountAddresses = ethAccountIds.map(accountId => fromAccountId(accountId).account)
    return (accountAddress ? [accountAddress] : ethAccountAddresses).map(
      accountAddress => foxEthState[accountAddress]?.farmingOpportunities ?? [],
    )
  },
)

export const selectFoxFarmingAccountsOpportunitiesAggregated = createDeepEqualOutputSelector(
  selectFoxFarmingOpportunitiesByMaybeAccountAddress,
  foxFarmingOpportunities => {
    const aggregatedOpportunitiesByContractAddress = foxFarmingOpportunities
      .flatMap(opportunity => opportunity)
      .reduce(farmingOpportunitiesReducer, {} as Record<string, FoxFarmingEarnOpportunityType>)

    return Object.values(aggregatedOpportunitiesByContractAddress)
  },
)

// Non-aggregated opportunities, to use for account-level granularity
export const selectVisibleFoxFarmingAccountOpportunities = createDeepEqualOutputSelector(
  selectFoxFarmingOpportunitiesByMaybeAccountAddress,
  selectAccountAddressParamFromFilter,
  (foxFarmingOpportunities, accountAddress) => {
    return foxFarmingOpportunities
      .flatMap(opportunity => opportunity)
      .filter(
        opportunity =>
          (opportunity.accountAddress === accountAddress && !opportunity.expired) ||
          (opportunity.expired && bnOrZero(opportunity.cryptoAmount).gt(0)),
      )
  },
)

// Aggregated multi-account opportunities, and slaps the highest balance accountAddress in
export const selectVisibleFoxFarmingAccountOpportunitiesAggregated = createDeepEqualOutputSelector(
  selectFoxFarmingOpportunitiesByMaybeAccountAddress,
  (state: ReduxState) => state,
  (foxFarmingOpportunities, state) => {
    const aggregatedOpportunitiesByContractAddress = foxFarmingOpportunities
      .flatMap(opportunity => opportunity)
      .filter(
        opportunity =>
          !opportunity.expired || (opportunity.expired && bnOrZero(opportunity.cryptoAmount).gt(0)),
      )
      .reduce(farmingOpportunitiesReducer, {} as Record<string, FoxFarmingEarnOpportunityType>)

    return Object.values(aggregatedOpportunitiesByContractAddress).map(opportunity => {
      const highestBalanceAccountAddress = selectHighestBalanceFoxFarmingOpportunityAccountAddress(
        state,
        { contractAddress: opportunity.contractAddress },
      )

      return {
        ...opportunity,
        highestBalanceAccountAddress,
      }
    })
  },
)

export const selectFoxFarmingOpportunityByContractAddress = createDeepEqualOutputSelector(
  selectFoxFarmingOpportunitiesByMaybeAccountAddress,
  selectContractAddressParamFromFilter,
  selectAccountAddressParamFromFilter,
  (opportunities, contractAddress, accountAddress) =>
    opportunities
      .flatMap(opportunity => opportunity)
      .find(opportunity => {
        return (
          opportunity.contractAddress === contractAddress &&
          opportunity.accountAddress === accountAddress
        )
      }),
)

// Aggregations give precisely that, an aggregation
// When going from the context of an aggregation (e.g a DeFi card), to a specific account, we don't yet know which account has a / the highest balance
// By selecting the account with the highest balance, we ensure that we select an account with an actual balance for a farming opportunity at a given contractAddress
export const selectHighestBalanceFoxFarmingOpportunityAccountAddress = createSelector(
  selectFoxFarmingOpportunitiesByMaybeAccountAddress,
  selectContractAddressParamFromFilter,
  (opportunities, contractAddress) =>
    opportunities
      .flatMap(opportunity => opportunity)
      .filter(opportunity => opportunity.contractAddress === contractAddress)
      .sort((a, b) => {
        return bn(b.fiatAmount).minus(a.fiatAmount).toNumber()
      })[0]?.accountAddress ?? '',
)

// Aggregations give precisely that, an aggregation
// When going from the context of an aggregation (e.g a DeFi card), to a specific account, we don't yet know which account has a / the highest balance
// By selecting the account with the highest balance, we ensure that we select an account with an actual balance for a given LP opportunity
export const selectHighestBalanceFoxLpOpportunityAccountAddress = createSelector(
  selectFoxEthLpAccountOpportunitiesByMaybeAccountAddress,
  opportunities =>
    opportunities.sort((a, b) => bn(b.fiatAmount).minus(a.fiatAmount).toNumber())[0]
      ?.accountAddress ?? '',
)

export const selectFarmContractsAccountsBalanceAggregated = createSelector(
  selectFoxFarmingOpportunitiesByMaybeAccountAddress,
  (farmingOpportunities): string => {
    const foxFarmingTotalCryptoAmount = (farmingOpportunities ?? [])
      .flatMap(opportunity => opportunity)
      .reduce(
        (totalBalance, opportunity) => totalBalance.plus(bnOrZero(opportunity.cryptoAmount)),
        bnOrZero(0),
      )
    return foxFarmingTotalCryptoAmount.toString()
  },
)

export const selectLpPlusFarmContractsBaseUnitBalance = createSelector(
  selectAssets,
  selectFoxEthLpAccountsOpportunitiesAggregated,
  selectFarmContractsAccountsBalanceAggregated,
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
  // TODO(0xdef1cafe): this causes 200+ renders, we can't react on the entire slice changing!
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
  selectFarmContractsAccountsBalanceAggregated,
  (marketData, foxFarmingTotalCryptoAmount) => {
    const lpTokenPrice = marketData[foxEthLpAssetId]?.price ?? 0
    return bnOrZero(foxFarmingTotalCryptoAmount).times(lpTokenPrice).toFixed(2)
  },
)
