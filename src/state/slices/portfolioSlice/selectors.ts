import { createSelector } from '@reduxjs/toolkit'
import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  avalancheAssetId,
  bchAssetId,
  bscAssetId,
  btcAssetId,
  cosmosAssetId,
  dogeAssetId,
  ethAssetId,
  foxyAssetId,
  fromAccountId,
  fromAssetId,
  ltcAssetId,
  optimismAssetId,
  osmosisAssetId,
  polygonAssetId,
  thorchainAssetId,
} from '@shapeshiftoss/caip'
import type { BIP44Params } from '@shapeshiftoss/types'
import cloneDeep from 'lodash/cloneDeep'
import entries from 'lodash/entries'
import keys from 'lodash/keys'
import maxBy from 'lodash/maxBy'
import pickBy from 'lodash/pickBy'
import sum from 'lodash/sum'
import toNumber from 'lodash/toNumber'
import values from 'lodash/values'
import { createCachedSelector } from 're-reselect'
import type { BridgeAsset } from 'components/Bridge/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { BigNumber, BN } from 'lib/bignumber/bignumber'
import { bn, bnOrZero, convertPrecision } from 'lib/bignumber/bignumber'
import { isMobile } from 'lib/globals'
import { fromBaseUnit } from 'lib/math'
import { getMaybeCompositeAssetSymbol } from 'lib/mixpanel/helpers'
import type { AnonymizedPortfolio } from 'lib/mixpanel/types'
import { hashCode, isValidAccountNumber } from 'lib/utils'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import {
  selectAccountIdParamFromFilter,
  selectAccountNumberParamFromFilter,
  selectAssetIdParamFromFilter,
  selectChainIdParamFromFilter,
} from 'state/selectors'
import { selectAssets } from 'state/slices/assetsSlice/selectors'
import { selectSelectedCurrencyMarketDataSortedByMarketCap } from 'state/slices/marketDataSlice/selectors'
import { selectAllEarnUserLpOpportunitiesByFilter } from 'state/slices/opportunitiesSlice/selectors/lpSelectors'
import {
  selectAggregatedEarnUserStakingOpportunities,
  selectAllEarnUserStakingOpportunitiesByFilter,
  selectStakingOpportunitiesById,
  selectUserStakingOpportunitiesById,
} from 'state/slices/opportunitiesSlice/selectors/stakingSelectors'
import { genericBalanceIncludingStakingByFilter } from 'state/slices/portfolioSlice/utils'
import { selectBalanceThreshold } from 'state/slices/preferencesSlice/selectors'

import {
  selectPortfolioAccountBalancesBaseUnit,
  selectPortfolioAssetBalancesBaseUnit,
  selectPortfolioFiatBalances,
  selectPortfolioFiatBalancesByAccountId,
  selectWalletAccountIds,
  selectWalletId,
  selectWalletName,
} from '../common-selectors'
import {
  DEFI_PROVIDER_TO_METADATA,
  foxEthLpAssetId,
  foxEthStakingIds,
} from '../opportunitiesSlice/constants'
import { selectGetReadOnlyOpportunities } from '../opportunitiesSlice/selectors/readonly'
import type { DefiProvider, StakingId, UserStakingId } from '../opportunitiesSlice/types'
import {
  deserializeUserStakingId,
  getUnderlyingAssetIdsBalances,
} from '../opportunitiesSlice/utils'
import type {
  AccountMetadata,
  AccountMetadataById,
  AssetBalancesById,
  AssetEquityBalance,
  AssetEquityItem,
  PortfolioAccountBalancesById,
  PortfolioAccounts,
} from './portfolioSliceCommon'
import { AssetEquityType } from './portfolioSliceCommon'
import { findAccountsByAssetId } from './utils'

// We should prob change this once we add more chains
export const FEE_ASSET_IDS = [
  ethAssetId,
  btcAssetId,
  bchAssetId,
  cosmosAssetId,
  osmosisAssetId,
  thorchainAssetId,
  dogeAssetId,
  ltcAssetId,
  avalancheAssetId,
  optimismAssetId,
  bscAssetId,
  polygonAssetId,
]

export const selectPortfolioAccounts = createDeepEqualOutputSelector(
  selectWalletAccountIds,
  (state: ReduxState) => state.portfolio.accounts.byId,
  (walletAccountIds, accountsById): PortfolioAccounts['byId'] =>
    pickBy(accountsById, (_account, accountId: AccountId) => walletAccountIds.includes(accountId)),
)

export const selectPortfolioAssetIds = createDeepEqualOutputSelector(
  selectPortfolioAccountBalancesBaseUnit,
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

export const selectPortfolioTotalFiatBalance = createSelector(
  selectPortfolioFiatBalances,
  (portfolioFiatBalances): string =>
    Object.values(portfolioFiatBalances)
      .reduce((acc, assetFiatBalance) => acc.plus(bnOrZero(assetFiatBalance)), bn(0))
      .toFixed(2),
)

export const selectPortfolioTotalFiatBalanceExcludeEarnDupes = createSelector(
  selectPortfolioFiatBalances,
  (portfolioFiatBalances): string => {
    // ETH/FOX LP token and FOXy are portfolio assets, but they're also part of DeFi opportunities
    // With the current architecture (having them both as portfolio assets and earn opportunities), we have to remove these two some place or another
    // This obviously won't scale as we support more LP tokens, but for now, this at least gives this deduction a sane home we can grep with `dupes` or `duplicates`
    const portfolioEarnAssetIdsDuplicates = [foxEthLpAssetId, foxyAssetId]
    return Object.entries(portfolioFiatBalances)
      .reduce<BN>((acc, [assetId, assetFiatBalance]) => {
        if (portfolioEarnAssetIdsDuplicates.includes(assetId)) return acc
        return acc.plus(bnOrZero(assetFiatBalance))
      }, bn(0))
      .toFixed(2)
  },
)

export const selectPortfolioFiatBalanceByAssetId = createCachedSelector(
  selectPortfolioFiatBalances,
  selectAssetIdParamFromFilter,
  (portfolioFiatBalances, assetId): string | undefined => assetId && portfolioFiatBalances[assetId],
)((state: ReduxState, filter) => `${state.portfolio.walletId}-${filter?.assetId}` ?? 'assetId')

export const selectPortfolioFiatBalanceByFilter = createCachedSelector(
  selectPortfolioFiatBalances,
  selectPortfolioFiatBalancesByAccountId,
  selectAssetIdParamFromFilter,
  selectAccountIdParamFromFilter,
  (portfolioAssetFiatBalances, portfolioAccountFiatbalances, assetId, accountId): string => {
    if (assetId && !accountId) return portfolioAssetFiatBalances?.[assetId] ?? '0'
    if (assetId && accountId) return portfolioAccountFiatbalances?.[accountId]?.[assetId] ?? '0'
    if (!assetId && accountId) {
      const accountBalances = portfolioAccountFiatbalances[accountId]
      const totalAccountBalances =
        Object.values(accountBalances).reduce((totalBalance, fiatBalance) => {
          return bnOrZero(totalBalance).plus(bnOrZero(fiatBalance)).toFixed(2)
        }, '0') ?? '0'
      return totalAccountBalances
    }
    return '0'
  },
)((_s: ReduxState, filter) => `${filter?.accountId}-${filter?.assetId}` ?? 'accountId-assetId')

export const selectFirstAccountIdByChainId = createCachedSelector(
  selectWalletAccountIds,
  (_s: ReduxState, chainId: ChainId) => chainId,
  (accountIds, chainId): AccountId | undefined =>
    accountIds.filter(accountId => fromAccountId(accountId).chainId === chainId)[0],
)((_s: ReduxState, chainId) => chainId ?? 'chainId')

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
    selectPortfolioAccountBalancesBaseUnit,
    selectPortfolioAssetBalancesBaseUnit,
    selectSelectedCurrencyMarketDataSortedByMarketCap,
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
      ).reduce((acc, _account) => {
        return acc
      }, cloneDeep(rawBalances))
      // TODO: add LP portfolio amount to this
      const foxEthLpTotalBalancesIncludingDelegations = aggregatedEarnUserStakingOpportunities
        ?.filter(opportunity => foxEthStakingIds.includes(opportunity.assetId as StakingId))
        .reduce<BN>((acc: BN, opportunity) => {
          const asset = assetsById[opportunity.underlyingAssetId]
          return asset
            ? acc.plus(
                bnOrZero(opportunity.stakedAmountCryptoBaseUnit).div(bn(10).pow(asset.precision)),
              )
            : acc
        }, bn(0))
        .toFixed()
      totalBalancesIncludingAllDelegationStates[foxEthLpAssetId] =
        foxEthLpTotalBalancesIncludingDelegations

      const aboveThresholdBalances = Object.entries(
        totalBalancesIncludingAllDelegationStates,
      ).reduce<Record<AssetId, string>>((acc, [assetId, baseUnitBalance]) => {
        const asset = assetsById[assetId]
        if (!asset) return acc
        const precision = asset.precision
        const price = marketData[assetId]?.price
        const cryptoValue = fromBaseUnit(bnOrZero(baseUnitBalance), precision)
        const assetFiatBalance = bnOrZero(cryptoValue).times(bnOrZero(price))
        if (assetFiatBalance.lt(bnOrZero(balanceThreshold))) return acc
        // if it's above the threshold set the original object key and value to result
        acc[assetId] = baseUnitBalance ?? '0'
        return acc
      }, {})
      return aboveThresholdBalances
    },
  )

// we only set ids when chain adapters responds, so if these are present, the portfolio has loaded
export const selectPortfolioLoading = createSelector(
  selectWalletAccountIds,
  (ids): boolean => !Boolean(ids.length),
)

export const selectPortfolioAssetAccountBalancesSortedFiat = createDeepEqualOutputSelector(
  selectPortfolioFiatBalancesByAccountId,
  selectBalanceThreshold,
  (portfolioFiatAccountBalances, balanceThreshold): PortfolioAccountBalancesById => {
    return Object.entries(portfolioFiatAccountBalances).reduce<PortfolioAccountBalancesById>(
      (acc, [accountId, assetBalanceObj]) => {
        const sortedAssetsByFiatBalances = Object.entries(assetBalanceObj)
          .sort(([_, a], [__, b]) => (bnOrZero(a).gte(bnOrZero(b)) ? -1 : 1))
          .reduce<{ [k: AssetId]: string }>((acc, [assetId, assetFiatBalance]) => {
            if (bnOrZero(assetFiatBalance).lt(bnOrZero(balanceThreshold))) return acc
            acc[assetId] = assetFiatBalance ?? '0'
            return acc
          }, {})

        acc[accountId] = sortedAssetsByFiatBalances
        return acc
      },
      {},
    )
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
  selectPortfolioFiatBalancesByAccountId,
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
        bnOrZero(assetAccountFiatBalance[assetId]).div(totalAssetFiatBalance).times(100),
      ).toNumber()

      acc[currentAccountId] = allocation
      return acc
    }, {})

    return balanceAllocationById[accountId]
  },
)((_s: ReduxState, filter) => `${filter?.accountId}-${filter?.assetId}` ?? 'accountId-assetId')

export const selectPortfolioStakingCryptoBalances = createDeepEqualOutputSelector(
  selectPortfolioAccounts,
  selectUserStakingOpportunitiesById,
  selectStakingOpportunitiesById,
  (accounts, userStakingOpportunities, stakingOpportunitiesById): PortfolioAccountBalancesById => {
    return Object.entries(accounts).reduce<PortfolioAccountBalancesById>((acc, [accountId]) => {
      Object.entries(userStakingOpportunities)
        .filter(([userStakingId]) => {
          // TODO: This will only work for native assets staking currently, which is not better, not worse than previously
          // Find the right heuristics for this, and make this support staking for all opportunities
          const [opportunityAccountId] = deserializeUserStakingId(userStakingId as UserStakingId)
          return opportunityAccountId === accountId
        })
        .forEach(([userStakingId, userStakingOpportunity]) => {
          const [, stakingId] = deserializeUserStakingId(userStakingId as UserStakingId)
          const assetId = stakingOpportunitiesById[stakingId]?.assetId
          if (!assetId || !userStakingOpportunity) return acc
          if (!acc[accountId]) {
            acc[accountId] = {}
          }
          // Handle staking over multiple opportunities for a given AssetId e.g
          // - savers and native ATOM staking
          // - staking over different validators for the same AssetId
          const stakedAmountCryptoBaseUnit = userStakingOpportunity.stakedAmountCryptoBaseUnit
          acc[accountId][assetId] = bn(stakedAmountCryptoBaseUnit)
            .plus(bnOrZero(acc[accountId][assetId]))
            .toFixed()
        })
      return acc
    }, {})
  },
)

/**
 * selects all accounts in PortfolioAccountBalancesById form, including all
 * delegation, undelegation, and redelegation balances, with base unit crypto balances
 */
export const selectPortfolioAccountsCryptoBalancesIncludingStaking = createDeepEqualOutputSelector(
  selectPortfolioAccountBalancesBaseUnit,
  selectPortfolioStakingCryptoBalances,
  (accountBalances, stakingBalances): PortfolioAccountBalancesById => {
    return Object.entries(accountBalances).reduce<PortfolioAccountBalancesById>(
      (acc, [accountId, account]) => {
        if (!acc[accountId]) acc[accountId] = {}
        Object.entries(account).forEach(([assetId, balance]) => {
          const accountAssetStakingBalance = stakingBalances[accountId]?.[assetId]
          // TODO(gomes): This is a temporary fix until we figure out the DeFi heuristics for isDefiOpportunity or similarly named property
          // i.e a property that will allow us to know whether or not a wallet asset is exclusively used as a DeFi opportunity
          // This is obviously a suboptimal fix as if you stake the exact same amount (to the smallest base unit) of an asset as you have in your wallet,
          // it would not be counted in crypto (and hence fiat) total
          if (accountAssetStakingBalance === balance) {
            acc[accountId][assetId] = bnOrZero(balance).toString()
          } else {
            acc[accountId][assetId] = bnOrZero(balance)
              .plus(bnOrZero(accountAssetStakingBalance))
              .toString()
          }
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
          const asset = assets[assetId]
          if (asset) innerAcc[assetId] = fromBaseUnit(bnOrZero(cryptoBalance), asset.precision)
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
  selectSelectedCurrencyMarketDataSortedByMarketCap,
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
          return [assetId, bnOrZero(fromBaseUnit(bnOrZero(cryptoBalance), precision)).times(price)]
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

export type PortfolioAccountIdByNumberByChainId = {
  [accountNumber: number]: { [chainId: ChainId]: AccountId }
}

export const selectPortfolioAccountIdByNumberByChainId = createDeepEqualOutputSelector(
  selectPortfolioAccountsFiatBalancesIncludingStaking,
  selectPortfolioAccountMetadata,
  (accountBalances, accountMetadata): PortfolioAccountIdByNumberByChainId => {
    return Object.keys(accountBalances).reduce<PortfolioAccountIdByNumberByChainId>(
      (acc, accountId) => {
        const { chainId } = fromAccountId(accountId)
        const { accountNumber } = accountMetadata[accountId].bip44Params

        if (acc[accountNumber] === undefined) acc[accountNumber] = {}
        acc[accountNumber][chainId] = accountId

        return acc
      },
      {},
    )
  },
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
  selectPortfolioFiatBalancesByAccountId,
  selectBalanceThreshold,
  (portfolioAccounts, assetId, accountBalances, balanceThreshold) => {
    const accounts = findAccountsByAssetId(portfolioAccounts, assetId)
    const aboveThreshold = Object.entries(accountBalances).reduce<AccountId[]>(
      (acc, [accountId, balanceObj]) => {
        if (accounts.includes(accountId)) {
          const totalAccountFiatBalance = Object.values(balanceObj).reduce(
            (totalBalance, currentBalance) => {
              return bnOrZero(bn(totalBalance).plus(bnOrZero(currentBalance)))
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

export const selectAccountIdsByAssetIdAboveBalanceThresholdByFilter = createDeepEqualOutputSelector(
  selectAccountIdsByAssetIdAboveBalanceThreshold,
  selectAccountIdParamFromFilter,
  (accountIdsAboveThreshold, accountId): AccountId[] =>
    accountId
      ? accountIdsAboveThreshold.filter(listAccount => listAccount === accountId)
      : accountIdsAboveThreshold,
)

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
  selectSelectedCurrencyMarketDataSortedByMarketCap,
  selectPortfolioAssetBalancesBaseUnit,
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
        const asset = assetsById[assetId]
        if (!asset) return acc
        const { name, icon, symbol, precision } = asset
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

export const selectPortfolioAnonymized = createDeepEqualOutputSelector(
  selectAssets,
  selectWalletId,
  selectWalletName,
  selectPortfolioFiatBalances,
  selectPortfolioAssetBalancesBaseUnit,
  (
    assetsById,
    walletId,
    walletName = '',
    portfolioFiatBalances,
    portfolioCryptoBalances,
  ): AnonymizedPortfolio => {
    const hashedWalletId = hashCode(walletId || '')

    type AssetBalances = Record<string, number>
    type ChainBalances = Record<string, number>

    const [assetBalances, chainBalances, portfolioBalanceBN] = Object.entries(
      portfolioFiatBalances,
    ).reduce<[AssetBalances, ChainBalances, BigNumber]>(
      (acc, [assetId, balance]) => {
        // by asset
        const assetName = getMaybeCompositeAssetSymbol(assetId, assetsById)
        acc[0][assetName] = Number(balance)

        // by chain
        const { chainId } = fromAssetId(assetId)
        const chain = getChainAdapterManager().get(chainId)?.getDisplayName()
        if (!chain) return acc
        if (!acc[1][chain]) acc[1][chain] = 0
        acc[1][chain] = Number(bnOrZero(acc[1][chain]).plus(bnOrZero(balance)).toPrecision(2))

        // total
        acc[2] = bnOrZero(acc[2]).plus(bnOrZero(balance))

        return acc
      },
      [{}, {}, bn(0)],
    )

    const assets = Object.keys(assetBalances)
    const chains = Object.keys(chainBalances)
    const portfolioBalance = Number(portfolioBalanceBN.toFixed(2))
    const hasCryptoBalance = Object.values(portfolioCryptoBalances).some(b => bn(b).gt(0))

    return {
      'Has Crypto Balance': hasCryptoBalance,
      'Is Mobile': isMobile,
      'Wallet ID': hashedWalletId,
      'Wallet Name': walletName,
      'Portfolio Balance': portfolioBalance,
      Chains: chains,
      Assets: assets,
      'Asset Balances': assetBalances,
      'Chain Balances': chainBalances,
    }
  },
)

export const selectAccountIdByAccountNumberAndChainId = createSelector(
  selectWalletAccountIds,
  selectPortfolioAccountMetadata,
  selectAccountNumberParamFromFilter,
  selectChainIdParamFromFilter,
  (walletAccountIds, accountMetadata, accountNumber, chainId): AccountId | undefined => {
    if (!isValidAccountNumber(accountNumber))
      throw new Error(`invalid account number: ${accountNumber}`)
    if (chainId === undefined) throw new Error('undefined chain id')

    return walletAccountIds.find(accountId => {
      if (fromAccountId(accountId).chainId !== chainId) return false
      if (accountNumber !== accountMetadata[accountId].bip44Params.accountNumber) return false
      return true
    })
  },
)

export const selectAssetEquityItemsByFilter = createDeepEqualOutputSelector(
  selectAccountIdsByAssetIdAboveBalanceThresholdByFilter,
  selectPortfolioFiatBalancesByAccountId,
  selectPortfolioAccountBalancesBaseUnit,
  selectAllEarnUserLpOpportunitiesByFilter,
  selectAllEarnUserStakingOpportunitiesByFilter,
  selectAssets,
  selectSelectedCurrencyMarketDataSortedByMarketCap,
  selectAssetIdParamFromFilter,
  selectGetReadOnlyOpportunities,
  (
    accountIds,
    portfolioFiatBalances,
    portfolioCryptoBalancesBaseUnit,
    lpOpportunities,
    stakingOpportunities,
    assets,
    marketData,
    assetId,
    readOnlyOpportunities,
  ): AssetEquityItem[] => {
    if (!assetId) return []
    const asset = assets[assetId]
    const accounts = accountIds.map(accountId => {
      const fiatAmount = bnOrZero(portfolioFiatBalances[accountId][assetId]).toString()
      const cryptoAmountBaseUnit = bnOrZero(
        portfolioCryptoBalancesBaseUnit[accountId][assetId],
      ).toString()
      const amountCryptoPrecision = fromBaseUnit(
        bnOrZero(cryptoAmountBaseUnit),
        asset?.precision ?? 0,
      )
      return {
        id: accountId,
        type: AssetEquityType.Account,
        fiatAmount,
        provider: 'wallet',
        amountCryptoPrecision,
        color: asset?.color,
      }
    })
    const staking = stakingOpportunities.map(stakingOpportunity => {
      // Because the underlying assets can have different precisions
      // We need to convert it to the asset we are viewing to get correct amounts to sum together.
      const underlyingAssetPrecision =
        assets[stakingOpportunity.assetId]?.precision ?? asset?.precision
      const cryptoAmountBaseUnit = convertPrecision({
        value: bnOrZero(stakingOpportunity.cryptoAmountBaseUnit),
        inputExponent: underlyingAssetPrecision,
        outputExponent: asset?.precision ?? 0,
      }).toString()
      const amountCryptoPrecision = fromBaseUnit(
        bnOrZero(cryptoAmountBaseUnit),
        asset?.precision ?? 0,
      )
      return {
        id: stakingOpportunity.id,
        type: AssetEquityType.Staking,
        fiatAmount: stakingOpportunity.fiatAmount,
        amountCryptoPrecision,
        underlyingAssetId: stakingOpportunity.underlyingAssetId,
        provider: stakingOpportunity.provider,
        color:
          DEFI_PROVIDER_TO_METADATA[stakingOpportunity.provider as DefiProvider]?.color ??
          readOnlyOpportunities.data?.metadataByProvider?.[
            stakingOpportunity.provider as DefiProvider
          ]?.color,
      }
    })
    const lp = lpOpportunities.map(lpOpportunity => {
      const underlyingBalances = getUnderlyingAssetIdsBalances({
        underlyingAssetIds: lpOpportunity.underlyingAssetIds,
        underlyingAssetRatiosBaseUnit: lpOpportunity.underlyingAssetRatiosBaseUnit,
        cryptoAmountBaseUnit: lpOpportunity.cryptoAmountBaseUnit,
        assetId: lpOpportunity.id,
        assets,
        marketData,
      })
      return {
        id: lpOpportunity.id,
        type: AssetEquityType.LP,
        fiatAmount: underlyingBalances[assetId].fiatAmount,
        amountCryptoPrecision: underlyingBalances[assetId].cryptoBalancePrecision,
        provider: lpOpportunity.provider,
        color:
          DEFI_PROVIDER_TO_METADATA[lpOpportunity.provider as DefiProvider]?.color ??
          readOnlyOpportunities.data?.metadataByProvider?.[lpOpportunity.provider as DefiProvider]
            ?.color,
      }
    })
    return accounts
      .concat(lp)
      .concat(staking)
      .sort((a, b) => bnOrZero(b.fiatAmount).minus(a.fiatAmount).toNumber())
  },
)

export const selectEquityTotalBalance = createDeepEqualOutputSelector(
  selectAssetEquityItemsByFilter,
  (assetEquities): AssetEquityBalance => {
    const initial = {
      fiatAmount: '0',
      amountCryptoPrecision: '0',
    }
    return assetEquities.reduce(
      (sum, item) => ({
        fiatAmount: bnOrZero(item.fiatAmount).plus(bnOrZero(sum.fiatAmount)).toString(),
        amountCryptoPrecision: bnOrZero(item.amountCryptoPrecision)
          .plus(bnOrZero(sum.amountCryptoPrecision))
          .toString(),
      }),
      initial,
    )
  },
)
