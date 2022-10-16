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
import type { FoxEthLpEarnOpportunityType, FoxFarmingEarnOpportunityType } from './foxEthCommon'

type ParamFilter = {
  accountAddress?: string
  contractAddress?: string
}
type OptionalParamFilter = {
  accountAddress?: string
  contractAddress?: string
}

type ParamFilterKey = keyof ParamFilter
type OptionalParamFilterKey = keyof OptionalParamFilter

const selectParamFromFilter =
  <T extends ParamFilterKey>(param: T) =>
  (_state: ReduxState, filter: Pick<ParamFilter, T>): ParamFilter[T] | '' =>
    filter?.[param] ?? ''

const selectParamFromFilterOptional =
  <T extends OptionalParamFilterKey>(param: T) =>
  (_state: ReduxState, filter: Pick<OptionalParamFilter, T>): OptionalParamFilter[T] | '' =>
    filter?.[param] ?? ''

const selectAccountAddressParamFromFilterOptional = selectParamFromFilterOptional('accountAddress')
const selectAccountAddressParamFromFilter = selectParamFromFilter('accountAddress')

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
  selectAccountAddressParamFromFilterOptional,
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
  foxEthAccountOpportunities => foxEthAccountOpportunities[0],
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

export const selectFoxFarmingOpportunitiesByMaybeAccountAddress = createSelector(
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

export const selectFoxFarmingAccountsOpportunitiesAggregated = createSelector(
  selectFoxFarmingOpportunitiesByMaybeAccountAddress,
  foxFarmingOpportunities => {
    const aggregatedOpportunitiesByContractAddress = foxFarmingOpportunities
      .flatMap(opportunity => opportunity)
      .reduce((acc, opportunity) => {
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
      }, {} as Record<string, FoxFarmingEarnOpportunityType>)

    return Object.values(aggregatedOpportunitiesByContractAddress)
  },
)

export const selectVisibleFoxFarmingOpportunities = createDeepEqualOutputSelector(
  selectFoxFarmingOpportunitiesByMaybeAccountAddress,
  opportunities => {
    return opportunities
      .flatMap(opportunity => opportunity) // TODO: actual aggregation
      .filter(
        opportunity =>
          !opportunity.expired || (opportunity.expired && bnOrZero(opportunity.cryptoAmount).gt(0)),
      )
  },
)

export const selectVisibleFoxFarmingAccountOpportunitiesAggregated = createSelector(
  selectFoxFarmingOpportunitiesByMaybeAccountAddress,
  foxFarmingOpportunities => {
    const aggregatedOpportunitiesByContractAddress = foxFarmingOpportunities
      .flatMap(opportunity => opportunity)
      .filter(
        opportunity =>
          !opportunity.expired || (opportunity.expired && bnOrZero(opportunity.cryptoAmount).gt(0)),
      )
      .reduce((acc, opportunity) => {
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
      }, {} as Record<string, FoxFarmingEarnOpportunityType>)

    return Object.values(aggregatedOpportunitiesByContractAddress)
  },
)

export const selectFoxFarmingOpportunityByContractAddress = createSelector(
  selectFoxFarmingOpportunitiesByMaybeAccountAddress,
  selectContractAddressParamFromFilter,
  selectAccountAddressParamFromFilter,
  (opportunities, contractAddress, accountAddress) =>
    opportunities
      .flatMap(opportunity => opportunity)
      .find(
        opportunity =>
          opportunity.contractAddress === contractAddress &&
          opportunity.accountAddress === accountAddress,
      ),
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
