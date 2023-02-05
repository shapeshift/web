
import {
  accountIdToFeeAssetId,
  genericBalanceIncludingStakingByFilter,
} from 'state/slices/portfolioSlice/utils'
export const selectAllStakingDelegationCrypto = createDeepEqualOutputSelector(
  selectPortfolioAccounts,
  portfolioAccounts => {
    const allStakingData = Object.entries(portfolioAccounts)
    const allStakingDelegationCrypto = reduce(
      allStakingData,
      (acc, [accountId, portfolioData]) => {
        if (!portfolioData.stakingDataByValidatorId) return acc
        const delegations = Object.values(portfolioData.stakingDataByValidatorId)
          .flatMap(stakingDataByValidator => Object.values(stakingDataByValidator))
          .flatMap(({ delegations }) => delegations)
        const delegationSum = reduce(
          delegations,
          (acc, delegation) => acc.plus(bnOrZero(delegation.amount)),
          bn(0),
        )
        return { ...acc, [accountId]: delegationSum }
      },
      {},
    )

    return allStakingDelegationCrypto
  },
)

export const selectAllStakingUndelegationCrypto = createDeepEqualOutputSelector(
  selectPortfolioAccounts,
  portfolioAccounts => {
    const allStakingData = Object.entries(portfolioAccounts)
    const allStakingDelegationCrypto = reduce(
      allStakingData,
      (acc, [accountId, portfolioData]) => {
        if (!portfolioData.stakingDataByValidatorId) return acc
        const undelegations = Object.values(portfolioData.stakingDataByValidatorId)
          .flatMap(stakingDataByValidator => Object.values(stakingDataByValidator))
          .flatMap(({ undelegations }) => undelegations)
        const delegationSum = reduce(
          undelegations,
          (acc, undelegation) => acc.plus(bnOrZero(undelegation.amount)),
          bn(0),
        )
        return { ...acc, [accountId]: delegationSum }
      },
      {},
    )

    return allStakingDelegationCrypto
  },
)

export const selectTotalStakingDelegationFiat = createDeepEqualOutputSelector(
  selectAllStakingDelegationCrypto,
  selectMarketDataSortedByMarketCap,
  (state: ReduxState) => state.assets.byId,
  (allStaked: { [k: string]: string }, marketData, assetsById) => {
    const allStakingData = Object.entries(allStaked)

    const totalStakingDelegationFiat = reduce(
      allStakingData,
      (acc, [accountId, baseUnitAmount]) => {
        const assetId = accountIdToFeeAssetId(accountId)
        if (!assetId) return acc
        const asset = assetsById[assetId]
        if (!asset) return acc
        const price = marketData[assetId]?.price ?? 0
        const amount = fromBaseUnit(baseUnitAmount, asset.precision ?? 0)
        return bnOrZero(amount).times(price).plus(acc)
      },
      bn(0),
    )

    return totalStakingDelegationFiat
  },
)

export const selectTotalStakingUndelegationFiat = createDeepEqualOutputSelector(
  selectAllStakingUndelegationCrypto,
  selectMarketDataSortedByMarketCap,
  (state: ReduxState) => state.assets.byId,
  (allStaked: { [k: string]: string }, marketData, assetsById) => {
    const allStakingData = Object.entries(allStaked)

    const totalStakingDelegationFiat = reduce(
      allStakingData,
      (acc, [accountId, baseUnitAmount]) => {
        const assetId = accountIdToFeeAssetId(accountId)
        if (!assetId) return acc
        const asset = assetsById[assetId]
        if (!asset) return acc
        const price = marketData[assetId]?.price ?? 0
        const amount = fromBaseUnit(baseUnitAmount, asset.precision ?? 0)
        return bnOrZero(amount).times(price).plus(acc)
      },
      bn(0),
    )

    return totalStakingDelegationFiat
  },
)

// If an AccountId is passed, selects data by AccountId
// Else, aggregates the data for all AccountIds for said asset
// Always returns an array, either of one or many - needs to be unwrapped
export const selectStakingDataByFilter = createCachedSelector(
  selectPortfolioAccounts,
  selectAccountIdParamFromFilter,
  selectPortfolioAccountIdsByAssetId,
  (portfolioAccounts, maybeAccountId, accountIds): (StakingDataByValidatorId | null)[] => {
    return (maybeAccountId ? [maybeAccountId] : accountIds).map(
      accountId => portfolioAccounts?.[accountId]?.stakingDataByValidatorId || null,
    )
  },
)((_s: ReduxState, filter) => `${filter?.accountId}-${filter?.assetId}` ?? 'accountId-assetId')
