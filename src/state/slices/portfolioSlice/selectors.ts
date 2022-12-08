import { createSelector } from '@reduxjs/toolkit'
import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  avalancheAssetId,
  bchAssetId,
  btcAssetId,
  cosmosAssetId,
  dogeAssetId,
  ethAssetId,
  fromAccountId,
  fromAssetId,
  ltcAssetId,
  osmosisAssetId,
  thorchainAssetId,
} from '@shapeshiftoss/caip'
import type { cosmossdk } from '@shapeshiftoss/chain-adapters'
import type { BIP44Params } from '@shapeshiftoss/types'
import { uniq } from 'lodash'
import cloneDeep from 'lodash/cloneDeep'
import entries from 'lodash/entries'
import keys from 'lodash/keys'
import maxBy from 'lodash/maxBy'
import pickBy from 'lodash/pickBy'
import reduce from 'lodash/reduce'
import size from 'lodash/size'
import sum from 'lodash/sum'
import toNumber from 'lodash/toNumber'
import values from 'lodash/values'
import { createCachedSelector } from 're-reselect'
import type { BridgeAsset } from 'components/Bridge/types'
import type { BigNumber, BN } from 'lib/bignumber/bignumber'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { isValidAccountNumber } from 'lib/utils'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import {
  selectAccountIdParamFromFilter,
  selectAccountNumberParamFromFilter,
  selectAssetIdParamFromFilter,
  selectChainIdParamFromFilter,
  selectValidatorAddressParamFromFilter,
} from 'state/selectors'
import { selectAssets } from 'state/slices/assetsSlice/selectors'
import { selectMarketDataSortedByMarketCap } from 'state/slices/marketDataSlice/selectors'
import { selectAggregatedEarnUserStakingOpportunities } from 'state/slices/opportunitiesSlice/selectors'
import {
  accountIdToFeeAssetId,
  genericBalanceIncludingStakingByFilter,
} from 'state/slices/portfolioSlice/utils'
import { selectBalanceThreshold, selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'

import {
  selectPortfolioAccountBalances,
  selectPortfolioAssetBalances,
  selectWalletAccountIds,
} from '../common-selectors'
import { foxEthLpAssetId, foxEthStakingIds } from '../opportunitiesSlice/constants'
import type { StakingId } from '../opportunitiesSlice/types'
import {
  SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS,
  SHAPESHIFT_OSMOSIS_VALIDATOR_ADDRESS,
} from '../validatorDataSlice/constants'
import { selectValidators } from '../validatorDataSlice/selectors'
import {
  getDefaultValidatorAddressFromAccountId,
  getDefaultValidatorAddressFromAssetId,
} from '../validatorDataSlice/utils'
import type { PubKey } from '../validatorDataSlice/validatorDataSlice'
import type {
  AccountMetadata,
  AccountMetadataById,
  AssetBalancesById,
  PortfolioAccountBalancesById,
  PortfolioAccounts,
  StakingDataByValidatorId,
} from './portfolioSliceCommon'
import { findAccountsByAssetId } from './utils'

// We should prob change this once we add more chains
const FEE_ASSET_IDS = [
  ethAssetId,
  btcAssetId,
  bchAssetId,
  cosmosAssetId,
  osmosisAssetId,
  thorchainAssetId,
  dogeAssetId,
  ltcAssetId,
  avalancheAssetId,
]

export const selectPortfolioAccounts = createDeepEqualOutputSelector(
  selectWalletAccountIds,
  (state: ReduxState) => state.portfolio.accounts.byId,
  (walletAccountIds, accountsById): PortfolioAccounts['byId'] =>
    pickBy(accountsById, (_account, accountId: AccountId) => walletAccountIds.includes(accountId)),
)

export const selectPortfolioAssetIds = createDeepEqualOutputSelector(
  selectPortfolioAccountBalances,
  (accountBalancesById): AssetId[] =>
    Array.from(new Set(Object.values(accountBalancesById).flatMap(Object.keys))),
)

export const selectPortfolioAccountMetadata = createDeepEqualOutputSelector(
  (state: ReduxState): AccountMetadataById => state.portfolio.accountMetadata.byId,
  selectWalletAccountIds,
  (accountMetadata, walletAccountIds): AccountMetadataById =>
    pickBy(accountMetadata, (_, accountId: AccountId) => walletAccountIds.includes(accountId)),
)

export const selectPortfolioAccountMetadataByAccountId = createCachedSelector(
  selectPortfolioAccountMetadata,
  selectAccountIdParamFromFilter,
  (accountMetadata, accountId): AccountMetadata | undefined =>
    accountId && accountMetadata[accountId],
)((_s: ReduxState, filter) => filter?.accountId ?? 'accountId')

export const selectBIP44ParamsByAccountId = createCachedSelector(
  selectPortfolioAccountMetadata,
  selectAccountIdParamFromFilter,
  (accountMetadata, accountId): BIP44Params | undefined =>
    accountId && accountMetadata[accountId]?.bip44Params,
)((_s: ReduxState, filter) => filter?.accountId ?? 'accountId')

export const selectAccountNumberByAccountId = createCachedSelector(
  selectBIP44ParamsByAccountId,
  (bip44Params): number | undefined => bip44Params?.accountNumber,
)((_s: ReduxState, filter) => filter?.accountId ?? 'accountId')

type PortfolioLoadingStatus = 'loading' | 'success' | 'error'

type PortfolioLoadingStatusGranular = {
  [k: AccountId]: PortfolioLoadingStatus
}

export const selectPortfolioLoadingStatusGranular = createDeepEqualOutputSelector(
  selectPortfolioAccountMetadata,
  selectPortfolioAccounts,
  (accountMetadata, accountsById): PortfolioLoadingStatusGranular => {
    const requestedAccountIds = keys(accountMetadata)
    return requestedAccountIds.reduce<PortfolioLoadingStatusGranular>((acc, accountId) => {
      const account = accountsById[accountId]
      const accountStatus = account ? (account.assetIds.length ? 'success' : 'error') : 'loading'
      acc[accountId] = accountStatus
      return acc
    }, {})
  },
)

export const selectPortfolioLoadingStatus = createSelector(
  selectPortfolioLoadingStatusGranular,
  (portfolioLoadingStatusGranular): PortfolioLoadingStatus => {
    const vals = values(portfolioLoadingStatusGranular)
    if (vals.every(val => val === 'loading')) return 'loading'
    if (vals.some(val => val === 'error')) return 'error'
    return 'success'
  },
)

export const selectPortfolioFiatBalances = createDeepEqualOutputSelector(
  selectAssets,
  selectMarketDataSortedByMarketCap,
  selectPortfolioAssetBalances,
  selectBalanceThreshold,
  (assetsById, marketData, balances, balanceThreshold) =>
    Object.entries(balances).reduce<Record<AssetId, string>>((acc, [assetId, baseUnitBalance]) => {
      const precision = assetsById[assetId]?.precision
      const price = marketData[assetId]?.price
      const cryptoValue = fromBaseUnit(baseUnitBalance, precision)
      const assetFiatBalance = bnOrZero(cryptoValue).times(bnOrZero(price))
      if (assetFiatBalance.lt(bnOrZero(balanceThreshold))) return acc
      acc[assetId] = assetFiatBalance.toFixed(2)
      return acc
    }, {}),
)

export const selectPortfolioFiatBalancesByAccount = createDeepEqualOutputSelector(
  selectAssets,
  selectPortfolioAccountBalances,
  selectMarketDataSortedByMarketCap,
  (assetsById, accounts, marketData) => {
    return Object.entries(accounts).reduce(
      (acc, [accountId, balanceObj]) => {
        acc[accountId] = Object.entries(balanceObj).reduce(
          (acc, [assetId, cryptoBalance]) => {
            const precision = assetsById[assetId]?.precision
            const price = marketData[assetId]?.price ?? 0
            const cryptoValue = fromBaseUnit(cryptoBalance, precision)
            const fiatBalance = bnOrZero(bn(cryptoValue).times(price)).toFixed(2)
            acc[assetId] = fiatBalance

            return acc
          },
          { ...balanceObj },
        )

        return acc
      },
      { ...accounts },
    )
  },
)

export const selectPortfolioTotalFiatBalance = createSelector(
  selectPortfolioFiatBalances,
  (portfolioFiatBalances): string =>
    Object.values(portfolioFiatBalances)
      .reduce((acc, assetFiatBalance) => acc.plus(bnOrZero(assetFiatBalance)), bn(0))
      .toFixed(2),
)

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
        const price = marketData[assetId]?.price ?? 0
        const amount = fromBaseUnit(baseUnitAmount, assetsById[assetId].precision ?? 0)
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
        const price = marketData[assetId]?.price ?? 0
        const amount = fromBaseUnit(baseUnitAmount, assetsById[assetId].precision ?? 0)
        return bnOrZero(amount).times(price).plus(acc)
      },
      bn(0),
    )

    return totalStakingDelegationFiat
  },
)

export const selectPortfolioTotalFiatBalanceWithStakingData = createSelector(
  selectPortfolioTotalFiatBalance,
  selectTotalStakingDelegationFiat,
  selectTotalStakingUndelegationFiat,
  selectAggregatedEarnUserStakingOpportunities,
  (
    portfolioFiatBalance,
    delegationFiatBalance,
    undelegationFiatBalance,
    aggregatedEarnUserStakingOpportunities,
  ): string => {
    return bnOrZero(portfolioFiatBalance)
      .plus(delegationFiatBalance)
      .plus(undelegationFiatBalance)
      .plus(
        aggregatedEarnUserStakingOpportunities.reduce(
          (acc, opportunity) => acc.plus(opportunity.fiatAmount),
          bn(0),
        ),
      )
      .toFixed()
  },
)

export const selectPortfolioFiatBalanceByAssetId = createCachedSelector(
  selectPortfolioFiatBalances,
  selectAssetIdParamFromFilter,
  (portfolioFiatBalances, assetId): string | undefined => assetId && portfolioFiatBalances[assetId],
)((state: ReduxState, filter) => `${state.portfolio.walletId}-${filter?.assetId}` ?? 'assetId')

export const selectPortfolioFiatBalanceByFilter = createCachedSelector(
  selectPortfolioFiatBalances,
  selectPortfolioFiatBalancesByAccount,
  selectAssetIdParamFromFilter,
  selectAccountIdParamFromFilter,
  (portfolioAssetFiatBalances, portfolioAccountFiatbalances, assetId, accountId): string => {
    if (assetId && !accountId) return portfolioAssetFiatBalances?.[assetId] ?? '0'
    if (assetId && accountId) return portfolioAccountFiatbalances?.[accountId]?.[assetId] ?? '0'
    if (!assetId && accountId) {
      const accountBalances = portfolioAccountFiatbalances[accountId]
      const totalAccountBalances = Object.values(accountBalances).reduce(
        (totalBalance: string, fiatBalance: string) => {
          return bnOrZero(totalBalance).plus(fiatBalance).toFixed(2)
        },
        '0',
      )
      return totalAccountBalances
    }
    return '0'
  },
)((_s: ReduxState, filter) => `${filter?.accountId}-${filter?.assetId}` ?? 'accountId-assetId')

/**
 * TODO(0xdef1cafe): delete this when implementing idle - use selectPortfolioCryptoHumanBalanceByFilter
 * below which respects accountIds
 */
export const selectPortfolioCryptoBalanceByAssetId = createCachedSelector(
  selectPortfolioAssetBalances,
  selectAssetIdParamFromFilter,
  (byId, assetId): string | undefined => assetId && byId[assetId],
)((state: ReduxState, filter) => `${state.portfolio.walletId}-${filter?.assetId}` ?? 'assetId')

export const selectFirstAccountIdByChainId = createSelector(
  selectWalletAccountIds,
  (_s: ReduxState, chainId: ChainId) => chainId,
  (accountIds, chainId): AccountId | undefined =>
    accountIds.filter(accountId => fromAccountId(accountId).chainId === chainId)[0],
)

/**
 * selects portfolio account ids that *can* contain an assetId
 * e.g. we may be swapping into a new EVM account that does not necessarily contain FOX
 * but can contain it
 */
export const selectPortfolioAccountIdsByAssetId = createCachedSelector(
  selectWalletAccountIds,
  selectAssetIdParamFromFilter,
  (accountIds, assetId): AccountId[] => {
    // early return for scenarios where assetId is not available yet
    if (!assetId) return []
    const { chainId } = fromAssetId(assetId)
    return accountIds.filter(accountId => fromAccountId(accountId).chainId === chainId)
  },
)((state, paramFilter) => `${state.portfolio.walletId}-${paramFilter?.assetId}` ?? 'assetId')

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

/**
 * this selector is very specific; we need to consider
 * - raw account balances, that are
 * - above a threshold, including
 *   - delegations
 *   - redelegations
 *   - undelegations
 *   as delegations don't show in account balances, but we want them included in the total
 */
export const selectBalanceChartCryptoBalancesByAccountIdAboveThreshold =
  createDeepEqualOutputSelector(
    selectAssets,
    selectPortfolioAccountBalances,
    selectPortfolioAssetBalances,
    selectMarketDataSortedByMarketCap,
    selectBalanceThreshold,
    selectPortfolioAccounts,
    selectAggregatedEarnUserStakingOpportunities,
    selectAccountIdParamFromFilter,
    (
      assetsById,
      accountBalances,
      assetBalances,
      marketData,
      balanceThreshold,
      portfolioAccounts,
      aggregatedEarnUserStakingOpportunities,
      accountId,
    ): AssetBalancesById => {
      const rawBalances = (accountId ? accountBalances[accountId] : assetBalances) ?? {}
      // includes delegation, redelegation, and undelegation balances
      const totalBalancesIncludingAllDelegationStates: AssetBalancesById = Object.values(
        portfolioAccounts,
      ).reduce((acc, account) => {
        Object.values(account?.stakingDataByValidatorId ?? {}).forEach(stakingDataByAccountId => {
          Object.entries(stakingDataByAccountId).forEach(([stakingAccountId, stakingData]) => {
            // if passed an accountId filter, only aggregate for the given accountId
            if (accountId && stakingAccountId !== accountId) return
            const { delegations, redelegations, undelegations } = stakingData
            const redelegationEntries = redelegations.flatMap(redelegation => redelegation.entries)
            const combined = [...delegations, ...redelegationEntries, ...undelegations]
            combined.forEach(entry => {
              const { assetId, amount } = entry
              acc[assetId] = bnOrZero(acc[assetId]).plus(bnOrZero(amount)).toString()
            })
          })
        })
        return acc
      }, cloneDeep(rawBalances))
      // TODO: add LP portfolio amount to this
      const foxEthLpTotalBalancesIncludingDelegations = aggregatedEarnUserStakingOpportunities
        ?.filter(opportunity => foxEthStakingIds.includes(opportunity.assetId as StakingId))
        .reduce<BN>(
          (acc: BN, opportunity) =>
            acc.plus(
              bnOrZero(opportunity.stakedAmountCryptoBaseUnit).div(
                bn(10).pow(assetsById[opportunity.underlyingAssetId].precision),
              ),
            ),
          bn(0),
        )
        .toFixed()
      totalBalancesIncludingAllDelegationStates[foxEthLpAssetId] =
        foxEthLpTotalBalancesIncludingDelegations

      const aboveThresholdBalances = Object.entries(
        totalBalancesIncludingAllDelegationStates,
      ).reduce<Record<AssetId, string>>((acc, [assetId, baseUnitBalance]) => {
        const precision = assetsById[assetId]?.precision
        const price = marketData[assetId]?.price
        const cryptoValue = fromBaseUnit(baseUnitBalance, precision)
        const assetFiatBalance = bnOrZero(cryptoValue).times(bnOrZero(price))
        if (assetFiatBalance.lt(bnOrZero(balanceThreshold))) return acc
        // if it's above the threshold set the original object key and value to result
        acc[assetId] = baseUnitBalance
        return acc
      }, {})
      return aboveThresholdBalances
    },
  )

export const selectPortfolioMixedHumanBalancesBySymbol = createDeepEqualOutputSelector(
  selectAssets,
  selectMarketDataSortedByMarketCap,
  selectPortfolioAssetBalances,
  (assets, marketData, balances) =>
    Object.entries(balances).reduce<{ [k: AssetId]: { crypto: string; fiat: string } }>(
      (acc, [assetId, balance]) => {
        const precision = assets[assetId]?.precision
        const price = marketData[assetId]?.price
        const cryptoValue = fromBaseUnit(balance, precision)
        const assetFiatBalance = bnOrZero(cryptoValue).times(bnOrZero(price)).toFixed(2)
        acc[assets[assetId].assetId] = { crypto: cryptoValue, fiat: assetFiatBalance }
        return acc
      },
      {},
    ),
)

// we only set ids when chain adapters responds, so if these are present, the portfolio has loaded
export const selectPortfolioLoading = createSelector(
  selectWalletAccountIds,
  (ids): boolean => !Boolean(ids.length),
)

export const selectPortfolioAssetAccountBalancesSortedFiat = createDeepEqualOutputSelector(
  selectPortfolioFiatBalancesByAccount,
  selectBalanceThreshold,
  (portfolioFiatAccountBalances, balanceThreshold): PortfolioAccountBalancesById => {
    return Object.entries(portfolioFiatAccountBalances).reduce<PortfolioAccountBalancesById>(
      (acc, [accountId, assetBalanceObj]) => {
        const sortedAssetsByFiatBalances = Object.entries(assetBalanceObj)
          .sort(([_, a], [__, b]) => (bnOrZero(a).gte(bnOrZero(b)) ? -1 : 1))
          .reduce<{ [k: AssetId]: string }>((acc, [assetId, assetFiatBalance]) => {
            if (bnOrZero(assetFiatBalance).lt(bnOrZero(balanceThreshold))) return acc
            acc[assetId] = assetFiatBalance
            return acc
          }, {})

        acc[accountId] = sortedAssetsByFiatBalances
        return acc
      },
      {},
    )
  },
)

export const selectPortfolioAssetIdsSortedFiat = createDeepEqualOutputSelector(
  selectPortfolioAssetAccountBalancesSortedFiat,
  (portfolioFiatAccountBalances): AssetId[] => {
    const assetBalances = Object.values(portfolioFiatAccountBalances).reduce<Record<AssetId, BN>>(
      (acc, account) => {
        Object.entries(account).forEach(([assetId, fiatBalance]) => {
          acc[assetId] = bnOrZero(acc[assetId]).plus(fiatBalance)
        })
        return acc
      },
      {},
    )
    const sortedAssetIds = Object.entries(assetBalances)
      .sort(([, a], [, b]) => (a.gt(b) ? -1 : 1))
      .map(([assetId]) => assetId)
    return sortedAssetIds
  },
)

export const selectHighestFiatBalanceAccountByAssetId = createCachedSelector(
  selectPortfolioAssetAccountBalancesSortedFiat,
  selectAssetIdParamFromFilter,
  (accountIdAssetValues, assetId): AccountId | undefined => {
    if (!assetId) return
    const accountValueMap = Object.entries(accountIdAssetValues).reduce((acc, [k, v]) => {
      const assetValue = v[assetId]
      return assetValue ? acc.set(k, assetValue) : acc
    }, new Map<AccountId, string>())
    const highestBalanceAccountToAmount = maxBy([...accountValueMap], ([_, v]) =>
      bnOrZero(v).toNumber(),
    )
    return highestBalanceAccountToAmount?.[0]
  },
)((state: ReduxState, filter) => `${state.portfolio.walletId}-${filter?.assetId}` ?? 'assetId')

export const selectPortfolioAllocationPercentByFilter = createCachedSelector(
  selectPortfolioFiatBalances,
  selectPortfolioFiatBalancesByAccount,
  selectAccountIdParamFromFilter,
  selectAssetIdParamFromFilter,
  (assetFiatBalances, assetFiatBalancesByAccount, accountId, assetId): number | undefined => {
    if (!assetId) return
    if (!accountId) return
    const totalAssetFiatBalance = assetFiatBalances[assetId]
    const balanceAllocationById = Object.entries(assetFiatBalancesByAccount).reduce<{
      [k: AccountId]: number
    }>((acc, [currentAccountId, assetAccountFiatBalance]) => {
      const allocation = bnOrZero(
        bn(assetAccountFiatBalance[assetId]).div(totalAssetFiatBalance).times(100),
      ).toNumber()

      acc[currentAccountId] = allocation
      return acc
    }, {})

    return balanceAllocationById[accountId]
  },
)((_s: ReduxState, filter) => `${filter?.accountId}-${filter?.assetId}` ?? 'accountId-assetId')

/**
 * shape of PortfolioAccountBalancesById, but just delegation/undelegation/redelagation
 * amounts in base units
 */
export const selectPortfolioStakingCryptoBalances = createDeepEqualOutputSelector(
  selectPortfolioAccounts,
  (accounts): PortfolioAccountBalancesById => {
    return Object.entries(accounts).reduce<PortfolioAccountBalancesById>(
      (acc, [accountId, account]) => {
        Object.values(account?.stakingDataByValidatorId ?? {}).forEach(stakingDataByAssetId => {
          Object.values(stakingDataByAssetId).forEach(stakingData => {
            const { delegations, redelegations, undelegations } = stakingData
            const redelegationEntries = redelegations.flatMap(redelegation => redelegation.entries)
            const combined = [...delegations, ...redelegationEntries, ...undelegations]
            combined.forEach(({ assetId, amount }) => {
              if (!acc[accountId]) acc[accountId] = {}
              acc[accountId][assetId] = bnOrZero(acc[accountId][assetId]).plus(amount).toString()
            })
          })
        })
        return acc
      },
      {},
    )
  },
)

/**
 * returns crypto human staking amount by assetId and accountId filter
 */
export const selectPortfolioStakingCryptoHumanBalanceByFilter = createCachedSelector(
  selectAssets,
  selectPortfolioStakingCryptoBalances,
  selectAssetIdParamFromFilter,
  selectAccountIdParamFromFilter,
  (assets, stakingBalances, assetIdFilter, accountIdFilter): string => {
    return Object.entries(stakingBalances)
      .filter(([accountId]) => (accountIdFilter ? accountId === accountIdFilter : true))
      .reduce<BigNumber>((acc, [, account]) => {
        Object.entries(account)
          .filter(([assetId]) => (assetIdFilter ? assetId === assetIdFilter : true))
          .forEach(([assetId, balance]) => {
            acc = acc.plus(bnOrZero(fromBaseUnit(bnOrZero(balance), assets[assetId].precision)))
          })

        return acc
      }, bn(0))
      .toString()
  },
)((_s: ReduxState, filter) => `${filter?.accountId}-${filter?.assetId}` ?? 'accountId-assetId')

/**
 * selects all accounts in PortfolioAccountBalancesById form, including all
 * delegation, undelegation, and redelegation balances, with base unit crypto balances
 */
export const selectPortfolioAccountsCryptoBalancesIncludingStaking = createDeepEqualOutputSelector(
  selectPortfolioAccountBalances,
  selectPortfolioStakingCryptoBalances,
  (accountBalances, stakingBalances): PortfolioAccountBalancesById => {
    return Object.entries(accountBalances).reduce<PortfolioAccountBalancesById>(
      (acc, [accountId, account]) => {
        if (!acc[accountId]) acc[accountId] = {}
        Object.entries(account).forEach(([assetId, balance]) => {
          acc[accountId][assetId] = bnOrZero(balance)
            .plus(bnOrZero(stakingBalances[accountId]?.[assetId]))
            .toString()
        })
        return acc
      },
      {},
    )
  },
)

/**
 * same PortfolioAccountBalancesById shape, but human crypto balances
 */
export const selectPortfolioAccountsCryptoHumanBalancesIncludingStaking =
  createDeepEqualOutputSelector(
    selectAssets,
    selectPortfolioAccountsCryptoBalancesIncludingStaking,
    (assets, portfolioAccountsCryptoBalances): PortfolioAccountBalancesById => {
      return Object.entries(portfolioAccountsCryptoBalances).reduce((acc, [accountId, account]) => {
        acc[accountId] = Object.entries(account).reduce((innerAcc, [assetId, cryptoBalance]) => {
          innerAcc[assetId] = fromBaseUnit(cryptoBalance, assets[assetId].precision)
          return innerAcc
        }, cloneDeep(account))
        return acc
      }, cloneDeep(portfolioAccountsCryptoBalances))
    },
  )

/**
 * this returns the same shape as the input selector selectPortfolioAccountsCryptoBalancesIncludingStaking
 * but with values converted into fiat, and sorted by fiat at all levels
 */
export const selectPortfolioAccountsFiatBalancesIncludingStaking = createDeepEqualOutputSelector(
  selectAssets,
  selectMarketDataSortedByMarketCap,
  selectPortfolioAccountsCryptoBalancesIncludingStaking,
  (assets, marketData, portfolioAccountsCryptoBalances): PortfolioAccountBalancesById => {
    const fiatAccountEntries = Object.entries(portfolioAccountsCryptoBalances).reduce<{
      [k: AccountId]: { [k: AssetId]: string }
    }>((acc, [accountId, account]) => {
      const entries: [AssetId, BigNumber][] = Object.entries(account).map(
        ([assetId, cryptoBalance]) => {
          const asset = assets?.[assetId]
          if (!asset) return [assetId, bn(0)]
          const { precision } = asset
          const price = marketData[assetId]?.price ?? 0
          return [assetId, bnOrZero(fromBaseUnit(cryptoBalance, precision)).times(price)]
        },
      )

      const fiatAccountSorted = Object.fromEntries(
        entries
          .sort(([, a], [, b]) => (a.gt(b) ? -1 : 1))
          .map(([assetId, fiatBalance]) => [assetId, fiatBalance.toFixed(2)]),
      )
      acc[accountId] = fiatAccountSorted
      return acc
    }, {})

    const sumValues: (obj: Record<AssetId, string>) => number = obj =>
      sum(values(obj).map(toNumber))

    return (
      entries(fiatAccountEntries)
        // sum each account
        .map<[string, number]>(([accountId, account]) => [accountId, sumValues(account)])
        // sort by account balance
        .sort(([, sumA], [, sumB]) => (sumA > sumB ? -1 : 1))
        // return sorted accounts
        .reduce<PortfolioAccountBalancesById>((acc, [accountId]) => {
          acc[accountId] = fiatAccountEntries[accountId]
          return acc
        }, {})
    )
  },
)

export const selectFiatBalanceIncludingStakingByFilter = createCachedSelector(
  selectPortfolioAccountsFiatBalancesIncludingStaking,
  selectAssetIdParamFromFilter,
  selectAccountIdParamFromFilter,
  genericBalanceIncludingStakingByFilter,
)((_s: ReduxState, filter) => `${filter?.accountId}-${filter?.assetId}` ?? 'accountId-assetId')

export const selectCryptoHumanBalanceIncludingStakingByFilter = createCachedSelector(
  selectPortfolioAccountsCryptoHumanBalancesIncludingStaking,
  selectAssetIdParamFromFilter,
  selectAccountIdParamFromFilter,
  genericBalanceIncludingStakingByFilter,
)((_s: ReduxState, filter) => `${filter?.accountId}-${filter?.assetId}` ?? 'accountId-assetId')

export const selectPortfolioChainIdsSortedFiat = createDeepEqualOutputSelector(
  selectPortfolioAccountsFiatBalancesIncludingStaking,
  (fiatAccountBalances): ChainId[] =>
    Array.from(
      new Set(Object.keys(fiatAccountBalances).map(accountId => fromAccountId(accountId).chainId)),
    ),
)

export const selectPortfolioTotalBalanceByChainIdIncludeStaking = createCachedSelector(
  selectPortfolioAccountsFiatBalancesIncludingStaking,
  selectChainIdParamFromFilter,
  (fiatAccountBalances, chainId): string => {
    return Object.entries(fiatAccountBalances)
      .reduce((acc, [accountId, accountBalanceByAssetId]) => {
        if (fromAccountId(accountId).chainId !== chainId) return acc
        Object.values(accountBalanceByAssetId).forEach(assetBalance => {
          // use the outer accumulator
          acc = acc.plus(bnOrZero(assetBalance))
        })
        return acc
      }, bn(0))
      .toFixed(2)
  },
)((_s: ReduxState, filter) => filter?.chainId ?? 'chainId')

export const selectPortfolioAccountBalanceByAccountNumberAndChainId = createCachedSelector(
  selectPortfolioAccountsFiatBalancesIncludingStaking,
  selectPortfolioAccountMetadata,
  selectAccountNumberParamFromFilter,
  selectChainIdParamFromFilter,
  (accountBalances, accountMetadata, accountNumber, chainId): string => {
    if (!isValidAccountNumber(accountNumber)) throw new Error('invalid account number')
    return Object.entries(accountBalances)
      .reduce((acc, [accountId, accountBalanceByAssetId]) => {
        if (fromAccountId(accountId).chainId !== chainId) return acc
        if (accountNumber !== accountMetadata[accountId].bip44Params.accountNumber) return acc
        return acc.plus(
          Object.values(accountBalanceByAssetId).reduce(
            (innerAcc, cur) => innerAcc.plus(bnOrZero(cur)),
            bn(0),
          ),
        )
      }, bn(0))
      .toFixed(2)
  },
)(
  (_s: ReduxState, filter) =>
    `${filter?.accountNumber}-${filter?.chainId}` ?? 'accountNumber-chainId',
)

export type PortfolioAccountsGroupedByNumber = { [accountNumber: number]: AccountId[] }

export const selectPortfolioAccountsGroupedByNumberByChainId = createCachedSelector(
  selectPortfolioAccountsFiatBalancesIncludingStaking,
  selectPortfolioAccountMetadata,
  selectChainIdParamFromFilter,
  (accountBalances, accountMetadata, chainId): PortfolioAccountsGroupedByNumber => {
    return Object.keys(accountBalances).reduce<PortfolioAccountsGroupedByNumber>(
      (acc, accountId) => {
        if (fromAccountId(accountId).chainId !== chainId) return acc
        const { accountNumber } = accountMetadata[accountId].bip44Params
        if (!acc[accountNumber]) acc[accountNumber] = []
        acc[accountNumber].push(accountId)
        return acc
      },
      {},
    )
  },
)((_s: ReduxState, filter) => filter?.chainId ?? 'chainId')

export const selectPortfolioAssetIdsByAccountIdExcludeFeeAsset = createCachedSelector(
  selectPortfolioAssetAccountBalancesSortedFiat,
  selectAccountIdParamFromFilter,
  selectAssets,
  selectBalanceThreshold,
  (accountAssets, accountId, assets, balanceThreshold): AssetId[] => {
    if (!accountId) return []
    const assetsByAccountIds = accountAssets?.[accountId] ?? {}
    return Object.entries(assetsByAccountIds)
      .filter(
        ([assetId, assetFiatBalance]) =>
          !FEE_ASSET_IDS.includes(assetId) &&
          assets[assetId] &&
          bnOrZero(assetFiatBalance).gte(bnOrZero(balanceThreshold)),
      )
      .map(([assetId]) => assetId)
  },
)((_s: ReduxState, filter) => filter?.accountId ?? 'accountId')

export const selectAccountIdsByAssetId = createCachedSelector(
  selectPortfolioAccounts,
  selectAssetIdParamFromFilter,
  findAccountsByAssetId,
)((state: ReduxState, filter) => `${state.portfolio.walletId}-${filter?.assetId}` ?? 'assetId')

export const selectAccountIdsByAssetIdAboveBalanceThreshold = createCachedSelector(
  selectPortfolioAccounts,
  selectAssetIdParamFromFilter,
  selectPortfolioFiatBalancesByAccount,
  selectBalanceThreshold,
  (portfolioAccounts, assetId, accountBalances, balanceThreshold) => {
    const accounts = findAccountsByAssetId(portfolioAccounts, assetId)
    const aboveThreshold = Object.entries(accountBalances).reduce<AccountId[]>(
      (acc, [accountId, balanceObj]) => {
        if (accounts.includes(accountId)) {
          const totalAccountFiatBalance = Object.values(balanceObj).reduce(
            (totalBalance, currentBalance) => {
              return bnOrZero(bn(totalBalance).plus(bn(currentBalance)))
            },
            bnOrZero('0'),
          )
          if (totalAccountFiatBalance.lt(bnOrZero(balanceThreshold))) return acc
          acc.push(accountId)
        }
        return acc
      },
      [],
    )
    return aboveThreshold
  },
)((state: ReduxState, filter) => `${state.portfolio.walletId}-${filter?.assetId}` ?? 'assetId')

export type AccountRowData = {
  name: string
  icon: string
  symbol: string
  fiatAmount: string
  cryptoAmount: string
  assetId: AssetId
  allocation: number
  price: string
  priceChange: number
}

export const selectPortfolioAccountRows = createDeepEqualOutputSelector(
  selectAssets,
  selectMarketDataSortedByMarketCap,
  selectPortfolioAssetBalances,
  selectPortfolioTotalFiatBalance,
  selectBalanceThreshold,
  (
    assetsById,
    marketData,
    balances,
    totalPortfolioFiatBalance,
    balanceThreshold,
  ): AccountRowData[] => {
    const assetRows = Object.entries(balances).reduce<AccountRowData[]>(
      (acc, [assetId, baseUnitBalance]) => {
        const name = assetsById[assetId]?.name
        const icon = assetsById[assetId]?.icon
        const symbol = assetsById[assetId]?.symbol
        const precision = assetsById[assetId]?.precision
        const price = marketData[assetId]?.price ?? '0'
        const cryptoAmount = fromBaseUnit(baseUnitBalance, precision)
        const fiatAmount = bnOrZero(cryptoAmount).times(bnOrZero(price))
        /**
         * if fiatAmount is less than the selected threshold,
         * continue to the next asset balance by returning acc
         */
        if (fiatAmount.lt(bnOrZero(balanceThreshold))) return acc
        const allocation = bnOrZero(fiatAmount.toFixed(2))
          .div(bnOrZero(totalPortfolioFiatBalance))
          .times(100)
          .toNumber()
        const priceChange = marketData[assetId]?.changePercent24Hr ?? 0
        const data = {
          assetId,
          name,
          icon,
          symbol,
          fiatAmount: fiatAmount.toFixed(2),
          cryptoAmount,
          allocation,
          price,
          priceChange,
        }
        acc.push(data)
        return acc
      },
      [],
    )
    return assetRows
  },
)

export const selectPortfolioBridgeAssets = createDeepEqualOutputSelector(
  selectPortfolioAccountRows,
  (portfolioAssets): BridgeAsset[] => {
    return Object.entries(portfolioAssets).map(([_, v]) => {
      const implementations = undefined // TODO: implement here
      return {
        assetId: v.assetId,
        symbol: v.symbol,
        icon: v.icon,
        name: v.name,
        cryptoAmount: v.cryptoAmount,
        fiatAmount: v.fiatAmount,
        implementations,
      }
    })
  },
)

export type ActiveStakingOpportunity = {
  address: PubKey
  moniker: string
  apr: string
  tokens?: string
  /** @deprecated use cryptoAmountBaseUnit instead and derive precision amount from it*/
  cryptoAmountPrecision?: string
  cryptoAmountBaseUnit?: string
  rewards?: string
}

export const selectDelegationCryptoAmountByAssetIdAndValidator = createCachedSelector(
  selectStakingDataByFilter,
  selectValidatorAddressParamFromFilter,
  selectAssetIdParamFromFilter,
  (stakingData, validatorAddress, assetId): string | undefined => {
    if (!validatorAddress) return
    if (!assetId) return
    return stakingData
      .reduce((acc, currentStakingData) => {
        if (!currentStakingData) return acc

        acc = acc.plus(
          currentStakingData[validatorAddress]?.[assetId]?.delegations[0]?.amount ?? '0',
        )

        return acc
      }, bn(0))
      .toString()
  },
)(
  (_s: ReduxState, filter) =>
    `${filter?.validatorAddress}-${filter?.assetId}` ?? 'validatorAddress-assetId',
)

export const selectUnbondingEntriesByAccountId = createDeepEqualOutputSelector(
  selectStakingDataByFilter,
  selectValidatorAddressParamFromFilter,
  selectAssetIdParamFromFilter,
  (stakingDataByValidator, validatorAddress, assetId): cosmossdk.UndelegationEntry[] => {
    if (!validatorAddress) return []
    if (!assetId) return []
    // Since we pass an AccountId in, stakingDataByValidator is guaranteed to be 0-length
    // Thus, we can simply unwrap it by accessing the 0th item
    const unwrappedStakingDataByValidator = stakingDataByValidator[0]
    const validatorStakingData = unwrappedStakingDataByValidator?.[validatorAddress]?.[assetId]

    if (!validatorStakingData?.undelegations?.length) return []

    return validatorStakingData.undelegations
  },
)

export const selectUnbondingCryptoAmountByAssetIdAndValidator = createDeepEqualOutputSelector(
  selectUnbondingEntriesByAccountId,
  (unbondingEntries): string => {
    if (!unbondingEntries) return '0'

    const unbondingCryptoAmountByAssetIdAndValidator = unbondingEntries
      .reduce((acc, current) => {
        return acc.plus(bnOrZero(current.amount))
      }, bn(0))
      .toString()

    return unbondingCryptoAmountByAssetIdAndValidator
  },
)

export const selectTotalBondingsBalanceByAssetId = createSelector(
  selectUnbondingCryptoAmountByAssetIdAndValidator,
  selectDelegationCryptoAmountByAssetIdAndValidator,
  (unbondingCryptoBalance, delegationCryptoBalance): string => {
    return bnOrZero(unbondingCryptoBalance).plus(bnOrZero(delegationCryptoBalance)).toString()
  },
)

// New array object reference every time we return this expression: [SHAPESHIFT_VALIDATOR_ADDRESS]
// We need to explicitly deep output compare, since ([SHAPESHIFT_VALIDATOR_ADDRESS] === [SHAPESHIFT_VALIDATOR_ADDRESS]) === false
export const selectValidatorIdsByFilter = createDeepEqualOutputSelector(
  selectPortfolioAccounts,
  selectAccountIdParamFromFilter,
  (portfolioAccounts, accountId): PubKey[] => {
    if (!accountId)
      return uniq(
        values(portfolioAccounts).flatMap(portfolioAccount => portfolioAccount.validatorIds ?? []),
      )
    const portfolioAccount = portfolioAccounts?.[accountId]
    if (!portfolioAccount) return []
    if (!portfolioAccount?.validatorIds?.length)
      return [getDefaultValidatorAddressFromAccountId(accountId)]

    return portfolioAccount.validatorIds
  },
)

const selectDefaultStakingDataByValidatorId = createSelector(
  selectAssetIdParamFromFilter,
  selectValidators,
  (assetId, stakingDataByValidator) => {
    if (!assetId) return
    return stakingDataByValidator[getDefaultValidatorAddressFromAssetId(assetId)]
  },
)

export type OpportunitiesDataFull = {
  totalDelegations: string
  rewards: string
  isLoaded: boolean
  address: string
  moniker: string
  tokens?: string
  apr: string
  commission: string
}

export const selectStakingOpportunitiesDataFullByFilter = createCachedSelector(
  selectValidatorIdsByFilter,
  selectValidators,
  selectStakingDataByFilter,
  selectAssetIdParamFromFilter,
  selectDefaultStakingDataByValidatorId,
  selectFeatureFlags,
  (
    portfolioValidatorIds,
    validatorsData,
    stakingDataByValidator,
    assetId,
    defaultStakingData,
    featureFlags,
  ): OpportunitiesDataFull[] => {
    // used to enable/disable staking by feature flag
    const shouldShowStakingOpportunities = (() => {
      switch (assetId) {
        case osmosisAssetId:
          return featureFlags.OsmosisStaking
        default:
          return true
      }
    })()
    if (defaultStakingData && shouldShowStakingOpportunities) {
      const dummy: OpportunitiesDataFull[] = [
        {
          isLoaded: true,
          rewards: '0',
          totalDelegations: '0',
          ...defaultStakingData,
        },
      ]
      if (!portfolioValidatorIds.length) return dummy
      if (!assetId) return dummy
    }
    if (!assetId) return []

    const filteredValidatorIds = shouldShowStakingOpportunities ? portfolioValidatorIds : []
    return filteredValidatorIds.map(validatorId => {
      const delegatedAmount = stakingDataByValidator
        .reduce((acc, currentStakingDataByValidator) => {
          acc = acc.plus(
            currentStakingDataByValidator?.[validatorId]?.[assetId]?.delegations?.[0]?.amount ??
              '0',
          )

          return acc
        }, bn(0))
        .toString()

      const undelegatedEntries: cosmossdk.UndelegationEntry[] = stakingDataByValidator.reduce(
        (acc, currentStakingDataByValidator) => {
          if (currentStakingDataByValidator?.[validatorId]?.[assetId]?.undelegations) {
            acc = [...acc, ...currentStakingDataByValidator[validatorId]?.[assetId].undelegations]
          }

          return acc
        },
        [] as cosmossdk.UndelegationEntry[],
      )

      const totalDelegations = bnOrZero(delegatedAmount)
        .plus(
          undelegatedEntries.reduce<BN>(
            (acc, current) => acc.plus(bnOrZero(current.amount)),
            bn(0),
          ),
        )
        .toString()
      return {
        ...validatorsData[validatorId],
        // Delegated/Redelegated + Undelegation
        totalDelegations,
        // Rewards at 0 index: since we normalize staking data, we are guaranteed to have only one entry for the validatorId + assetId combination
        rewards: stakingDataByValidator
          .reduce((acc, currentStakingDataByValidator) => {
            acc = acc.plus(
              currentStakingDataByValidator?.[validatorId]?.[assetId]?.rewards?.[0]?.amount ?? '0',
            )

            return acc
          }, bn(0))
          .toString(),
        isLoaded: Boolean(validatorsData[validatorId]),
      }
    })
  },
)((_s: ReduxState, filter) => `${filter?.accountId}-${filter?.assetId}` ?? 'accountId-assetId')

export const selectHasActiveStakingOpportunity = createSelector(
  selectStakingOpportunitiesDataFullByFilter,
  stakingOpportunitiesData =>
    // More than one opportunity data means we have more than the default opportunity
    size(stakingOpportunitiesData) > 1 ||
    // If there's only one staking but it isn't the default opportunity, then it's an active staking
    (stakingOpportunitiesData[0]?.address !== SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS &&
      stakingOpportunitiesData[0]?.address !== SHAPESHIFT_OSMOSIS_VALIDATOR_ADDRESS) ||
    bnOrZero(stakingOpportunitiesData[0]?.rewards).gt(0) ||
    bnOrZero(stakingOpportunitiesData[0]?.totalDelegations).gt(0),
)
