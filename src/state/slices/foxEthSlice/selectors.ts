import { createSelector } from '@reduxjs/toolkit'
import type { AccountId } from '@shapeshiftoss/caip'
import { ethAssetId, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { createCachedSelector } from 're-reselect'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import {
  selectAccountAddressParamFromFilter,
  selectAccountAddressParamFromFilterOptional,
} from 'state/selectors'

import type { UserEarnOpportunityType } from './foxEthCommon'

const farmingOpportunitiesReducer = (
  acc: Record<string, UserEarnOpportunityType>,
  opportunity: UserEarnOpportunityType,
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
    rewardsAmountCryptoPrecision: bnOrZero(
      acc[opportunity.contractAddress]?.rewardsAmountCryptoPrecision,
    )
      .plus(bnOrZero(opportunity.rewardsAmountCryptoPrecision))
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
  selectAccountAddressParamFromFilterOptional,
  selectEthAccountIdsByAssetId,
  (foxEthState, accountAddress, ethAccountIds) => {
    const ethAccountAddresses = ethAccountIds.map(accountId => fromAccountId(accountId).account)
    return (accountAddress ? [accountAddress] : ethAccountAddresses).map(
      accountAddress => foxEthState[accountAddress]?.lpOpportunity,
    )
  },
)((_s: ReduxState, filter) => filter?.accountAddress ?? 'accountAddress')

export const selectFoxEthLpOpportunityByAccountAddress = createSelector(
  selectFoxEthLpAccountOpportunitiesByMaybeAccountAddress,
  foxEthAccountOpportunities => foxEthAccountOpportunities[0],
)

export const selectFoxFarmingOpportunitiesByMaybeAccountAddress = createDeepEqualOutputSelector(
  // TODO(0xdef1cafe): this causes 200+ renders, we can't react on the entire slice changing!
  (state: ReduxState) => state.foxEth,
  selectAccountAddressParamFromFilterOptional,
  selectEthAccountIdsByAssetId,
  (foxEthState, accountAddress, ethAccountIds) => {
    const ethAccountAddresses = ethAccountIds.map(accountId => fromAccountId(accountId).account)
    return (accountAddress ? [accountAddress] : ethAccountAddresses).map(
      accountAddress => foxEthState[accountAddress]?.farmingOpportunities ?? [],
    )
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
      .reduce(farmingOpportunitiesReducer, {} as Record<string, UserEarnOpportunityType>)

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
