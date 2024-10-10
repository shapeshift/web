import { createSelector } from '@reduxjs/toolkit'
import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import { FEE_ASSET_IDS, foxyAssetId, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import type {
  AccountMetadata,
  AccountMetadataById,
  BIP44Params,
  PartialRecord,
} from '@shapeshiftoss/types'
import cloneDeep from 'lodash/cloneDeep'
import entries from 'lodash/entries'
import keys from 'lodash/keys'
import orderBy from 'lodash/orderBy'
import pickBy from 'lodash/pickBy'
import sum from 'lodash/sum'
import toNumber from 'lodash/toNumber'
import values from 'lodash/values'
import { createCachedSelector } from 're-reselect'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { BigNumber, BN } from 'lib/bignumber/bignumber'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { isMobile } from 'lib/globals'
import { fromBaseUnit } from 'lib/math'
import { getMaybeCompositeAssetSymbol } from 'lib/mixpanel/helpers'
import type { AnonymizedPortfolio } from 'lib/mixpanel/types'
import { hashCode } from 'lib/utils'
import { isValidAccountNumber } from 'lib/utils/accounts'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import {
  selectAccountIdParamFromFilter,
  selectAccountNumberParamFromFilter,
  selectAssetIdParamFromFilter,
  selectChainIdParamFromFilter,
} from 'state/selectors'
import { selectMarketDataUserCurrency } from 'state/slices/marketDataSlice/selectors'
import { selectAllEarnUserLpOpportunitiesByFilter } from 'state/slices/opportunitiesSlice/selectors/lpSelectors'
import {
  selectAggregatedEarnUserStakingOpportunities,
  selectAllEarnUserStakingOpportunitiesByFilter,
  selectStakingOpportunitiesById,
  selectUserStakingOpportunitiesById,
} from 'state/slices/opportunitiesSlice/selectors/stakingSelectors'
import {
  genericBalanceIncludingStakingByFilter,
  getFirstAccountIdByChainId,
  getHighestUserCurrencyBalanceAccountByAssetId,
} from 'state/slices/portfolioSlice/utils'
import { selectBalanceThreshold } from 'state/slices/preferencesSlice/selectors'

import { selectAssets } from '../assetsSlice/selectors'
import {
  selectEnabledWalletAccountIds,
  selectPortfolioAccountBalancesBaseUnit,
  selectPortfolioAssetBalancesBaseUnit,
  selectPortfolioUserCurrencyBalances,
  selectPortfolioUserCurrencyBalancesByAccountId,
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
  AssetBalancesById,
  AssetEquityBalance,
  AssetEquityItem,
  PortfolioAccountBalancesById,
  PortfolioAccounts,
  WalletId,
} from './portfolioSliceCommon'
import { AssetEquityType } from './portfolioSliceCommon'
import { findAccountsByAssetId } from './utils'

export const selectPortfolioAccounts = createDeepEqualOutputSelector(
  selectEnabledWalletAccountIds,
  (state: ReduxState) => state.portfolio.accounts.byId,
  (walletAccountIds, accountsById): PortfolioAccounts['byId'] => {
    return pickBy(accountsById, (_account, accountId: AccountId) =>
      walletAccountIds.includes(accountId),
    )
  },
)

export const selectIsAccountIdEnabled = createCachedSelector(
  selectPortfolioAccounts,
  selectAccountIdParamFromFilter,
  (accountsById, accountId): boolean => {
    return accountId !== undefined && accountsById[accountId] !== undefined
  },
)((_s: ReduxState, filter) => filter?.accountId ?? 'accountId')

export const selectIsAnyAccountIdEnabled = createCachedSelector(
  selectPortfolioAccounts,
  (_state: ReduxState, accountIds: AccountId[]) => accountIds,
  (accountsById, accountIds): boolean => {
    if (accountIds.length === 0) return false
    return accountIds.some(accountId => accountsById[accountId] !== undefined)
  },
)((_s: ReduxState, accountIds) => JSON.stringify(accountIds))

export const selectPortfolioAssetIds = createDeepEqualOutputSelector(
  selectPortfolioAccountBalancesBaseUnit,
  (accountBalancesById): AssetId[] => {
    return Array.from(new Set(Object.values(accountBalancesById).flatMap(Object.keys)))
  },
)

export const selectPortfolioAccountMetadata = createDeepEqualOutputSelector(
  (state: ReduxState): AccountMetadataById => state.portfolio.accountMetadata.byId,
  selectEnabledWalletAccountIds,
  (accountMetadata, walletAccountIds): AccountMetadataById => {
    return pickBy(accountMetadata, (_, accountId: AccountId) =>
      walletAccountIds.includes(accountId),
    )
  },
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

export type PortfolioLoadingStatus = 'loading' | 'success' | 'error'

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

export const selectPortfolioErroredAccountIds = createDeepEqualOutputSelector(
  selectPortfolioLoadingStatusGranular,
  portfolioLoadingStatusGranular => {
    return entries(portfolioLoadingStatusGranular).reduce<AccountId[]>(
      (acc, [accountId, accountState]) => {
        accountState === 'error' && acc.push(accountId)
        return acc
      },
      [],
    )
  },
)

export const selectPortfolioLoadingStatus = createSelector(
  selectPortfolioLoadingStatusGranular,
  (portfolioLoadingStatusGranular): PortfolioLoadingStatus => {
    const vals = values(portfolioLoadingStatusGranular)

    if (!vals.length) return 'loading'
    if (vals.some(val => val === 'loading')) return 'loading'
    if (vals.some(val => val === 'error')) return 'error'
    return 'success'
  },
)

export const selectPortfolioDegradedState = createSelector(
  selectPortfolioLoadingStatusGranular,
  (portfolioLoadingStatusGranular): boolean => {
    return values(portfolioLoadingStatusGranular).some(val => val === 'error')
  },
)

export const selectPortfolioTotalUserCurrencyBalance = createSelector(
  selectPortfolioUserCurrencyBalances,
  (portfolioUserCurrencyBalances): string =>
    Object.values(portfolioUserCurrencyBalances)
      .reduce(
        (acc, assetUserCurrencyBalance) => acc.plus(bnOrZero(assetUserCurrencyBalance)),
        bn(0),
      )
      .toFixed(2),
)

export const selectPortfolioTotalUserCurrencyBalanceExcludeEarnDupes = createSelector(
  selectPortfolioUserCurrencyBalances,
  selectGetReadOnlyOpportunities,
  (portfolioUserCurrencyBalances, readOnlyOpportunities): string => {
    const readOnlyOpportunitiesDuplicates = Object.values(
      readOnlyOpportunities.data?.opportunities ?? {},
    ).map(opportunity => opportunity.assetId)
    // ETH/FOX LP token, FOXy, and other held tokens can be both portfolio assets, but also part of DeFi opportunities
    // With the current architecture (having them both as portfolio assets and earn opportunities), we have to remove these two some place or another
    // This obviously won't scale as we support more LP tokens, but for now, this at least gives this deduction a sane home we can grep with `dupes` or `duplicates`
    const portfolioEarnAssetIdsDuplicates = [foxEthLpAssetId, foxyAssetId].concat(
      readOnlyOpportunitiesDuplicates,
    )
    return Object.entries(portfolioUserCurrencyBalances)
      .reduce<BN>((acc, [assetId, assetUserCurrencyBalance]) => {
        if (portfolioEarnAssetIdsDuplicates.includes(assetId)) return acc
        return acc.plus(bnOrZero(assetUserCurrencyBalance))
      }, bn(0))
      .toFixed(2)
  },
)

export const selectPortfolioUserCurrencyBalanceByAssetId = createCachedSelector(
  selectPortfolioUserCurrencyBalances,
  selectAssetIdParamFromFilter,
  (portfolioUserCurrencyBalances, assetId): string | undefined =>
    assetId && portfolioUserCurrencyBalances[assetId],
)(
  (state: ReduxState, filter) =>
    `${state.portfolio.connectedWallet?.id ?? 'connectedWallet.id'}-${
      filter?.assetId ?? 'assetId'
    }`,
)

export const selectPortfolioUserCurrencyBalanceByFilter = createCachedSelector(
  selectPortfolioUserCurrencyBalances,
  selectPortfolioUserCurrencyBalancesByAccountId,
  selectAssetIdParamFromFilter,
  selectAccountIdParamFromFilter,
  (
    portfolioAssetUserCurrencyBalances,
    portfolioAccountUserCurrencyBalances,
    assetId,
    accountId,
  ): string => {
    if (assetId && !accountId) return portfolioAssetUserCurrencyBalances?.[assetId] ?? '0'
    if (assetId && accountId)
      return portfolioAccountUserCurrencyBalances?.[accountId]?.[assetId] ?? '0'
    if (!assetId && accountId) {
      const accountBalances = portfolioAccountUserCurrencyBalances[accountId]
      const totalAccountBalances =
        Object.values(accountBalances ?? {}).reduce((totalBalance, userCurrencyBalance) => {
          return bnOrZero(totalBalance).plus(bnOrZero(userCurrencyBalance)).toFixed(2)
        }, '0') ?? '0'
      return totalAccountBalances
    }
    return '0'
  },
)((_s: ReduxState, filter) => `${filter?.accountId ?? 'accountId'}-${filter?.assetId ?? 'assetId'}`)

export const selectFirstAccountIdByChainId = createCachedSelector(
  selectEnabledWalletAccountIds,
  (_s: ReduxState, chainId: ChainId) => chainId,
  getFirstAccountIdByChainId,
)((_s: ReduxState, chainId) => chainId ?? 'chainId')

/**
 * selects portfolio account ids that *can* contain an assetId
 * e.g. we may be swapping into a new EVM account that does not necessarily contain FOX
 * but can contain it
 */
export const selectPortfolioAccountIdsByAssetIdFilter = createDeepEqualOutputSelector(
  selectEnabledWalletAccountIds,
  selectAssetIdParamFromFilter,
  selectWalletId,
  (accountIds, assetId, walletId): AccountId[] => {
    // early return for scenarios where assetId/walletId is not available yet
    if (!assetId) return []
    if (!walletId) return []
    const { chainId } = fromAssetId(assetId)
    return accountIds.filter(accountId => fromAccountId(accountId).chainId === chainId)
  },
)
export const selectPortfolioAccountIdsByAssetId = createDeepEqualOutputSelector(
  selectPortfolioAccounts,
  (accounts): Record<AssetId, AccountId[]> => {
    return Object.entries(accounts).reduce<Record<AssetId, AccountId[]>>(
      (acc, [accountId, account]) => {
        account.assetIds.forEach(assetId => {
          if (!acc[assetId]) acc[assetId] = []
          acc[assetId].push(accountId)
        })
        return acc
      },
      {},
    )
  },
)

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
    selectMarketDataUserCurrency,
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
        const assetUserCurrencyBalance = bnOrZero(cryptoValue).times(bnOrZero(price))
        if (assetUserCurrencyBalance.lt(bnOrZero(balanceThreshold))) return acc
        // if it's above the threshold set the original object key and value to result
        acc[assetId] = baseUnitBalance ?? '0'
        return acc
      }, {})
      return aboveThresholdBalances
    },
  )

// we only set ids when chain adapters responds, so if these are present, the portfolio has loaded
export const selectIsPortfolioLoading = createSelector(
  // If at least one AccountId is loaded, consider the portfolio as loaded.
  // This may not be true in the case the user has custom account management and their first fetched account is disabled,
  // but this will display insta-loaded state for all (most) other cases
  selectWalletAccountIds,
  (ids): boolean => !Boolean(ids.length),
)

export const selectPortfolioAssetAccountBalancesSortedUserCurrency = createDeepEqualOutputSelector(
  selectPortfolioUserCurrencyBalancesByAccountId,
  selectBalanceThreshold,
  (portfolioUserCurrencyAccountBalances, balanceThreshold): PortfolioAccountBalancesById => {
    return Object.entries(
      portfolioUserCurrencyAccountBalances,
    ).reduce<PortfolioAccountBalancesById>((acc, [accountId, assetBalanceObj]) => {
      const sortedAssetsByUserCurrencyBalances = Object.entries(assetBalanceObj ?? {})
        .sort(([_, a], [__, b]) => (bnOrZero(a).gte(bnOrZero(b)) ? -1 : 1))
        .reduce<{ [k: AssetId]: string }>((acc, [assetId, assetUserCurrencyBalance]) => {
          if (bnOrZero(assetUserCurrencyBalance).lt(bnOrZero(balanceThreshold))) return acc
          acc[assetId] = assetUserCurrencyBalance ?? '0'
          return acc
        }, {})

      acc[accountId] = sortedAssetsByUserCurrencyBalances
      return acc
    }, {})
  },
)

export const selectHighestUserCurrencyBalanceAccountByAssetId = createCachedSelector(
  selectPortfolioAssetAccountBalancesSortedUserCurrency,
  selectAssetIdParamFromFilter,
  getHighestUserCurrencyBalanceAccountByAssetId,
)(
  (state: ReduxState, filter) =>
    `${state.portfolio.connectedWallet?.id ?? 'connectedWallet.id'}-${
      filter?.assetId ?? 'assetId'
    }`,
)

export const selectPortfolioAllocationPercentByFilter = createCachedSelector(
  selectPortfolioUserCurrencyBalances,
  selectPortfolioUserCurrencyBalancesByAccountId,
  selectAccountIdParamFromFilter,
  selectAssetIdParamFromFilter,
  (
    assetUserCurrencyBalances,
    assetUserCurrencyBalancesByAccount,
    accountId,
    assetId,
  ): number | undefined => {
    if (!assetId) return
    if (!accountId) return
    const totalAssetUserCurrencyBalance = assetUserCurrencyBalances[assetId]
    const balanceAllocationById = Object.entries(assetUserCurrencyBalancesByAccount).reduce<{
      [k: AccountId]: number
    }>((acc, [currentAccountId, assetAccountUserCurrencyBalance]) => {
      const allocation = bnOrZero(
        bnOrZero(assetAccountUserCurrencyBalance?.[assetId])
          .div(totalAssetUserCurrencyBalance)
          .times(100),
      ).toNumber()

      acc[currentAccountId] = allocation
      return acc
    }, {})

    return balanceAllocationById[accountId]
  },
)((_s: ReduxState, filter) => `${filter?.accountId ?? 'accountId'}-${filter?.assetId ?? 'assetId'}`)

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
export const selectPortfolioAccountsUserCurrencyBalancesIncludingStaking =
  createDeepEqualOutputSelector(
    selectAssets,
    selectMarketDataUserCurrency,
    selectPortfolioAccountsCryptoBalancesIncludingStaking,
    (assets, marketData, portfolioAccountsCryptoBalances): PortfolioAccountBalancesById => {
      const userCurrencyAccountEntries = Object.entries(portfolioAccountsCryptoBalances).reduce<{
        [k: AccountId]: { [k: AssetId]: string }
      }>((acc, [accountId, account]) => {
        const entries: [AssetId, BigNumber][] = Object.entries(account).reduce(
          (acc: [AssetId, BigNumber][], [assetId, cryptoBalance]) => {
            const asset = assets?.[assetId]
            if (!asset) return acc

            const { precision } = asset
            const price = marketData[assetId]?.price ?? 0
            const calculatedValue: [AssetId, BigNumber] = [
              assetId,
              bnOrZero(fromBaseUnit(bnOrZero(cryptoBalance), precision)).times(price),
            ]

            acc.push(calculatedValue)
            return acc
          },
          [],
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
        entries(userCurrencyAccountEntries)
          // sum each account
          .map<[string, number]>(([accountId, account]) => [accountId, sumValues(account)])
          // sort by account balance
          .sort(([, sumA], [, sumB]) => (sumA > sumB ? -1 : 1))
          // return sorted accounts
          .reduce<PortfolioAccountBalancesById>((acc, [accountId]) => {
            acc[accountId] = userCurrencyAccountEntries[accountId]
            return acc
          }, {})
      )
    },
  )

export const selectTotalPortfolioBalanceIncludeStakingUserCurrency = createCachedSelector(
  selectPortfolioAccountsUserCurrencyBalancesIncludingStaking,
  (userCurrencyAccountBalances): string =>
    Object.values(userCurrencyAccountBalances)
      .reduce(
        (acc, accountBalances) =>
          acc.plus(
            Object.values(accountBalances).reduce(
              (innerAcc, cur) => innerAcc.plus(bnOrZero(cur)),
              bn(0),
            ),
          ),
        bn(0),
      )
      .toFixed(2),
)((_s: ReduxState, _filter) => 'totalPortfolioBalanceIncludeStakingUserCurrency')

export const selectUserCurrencyBalanceIncludingStakingByFilter = createCachedSelector(
  selectPortfolioAccountsUserCurrencyBalancesIncludingStaking,
  selectAssetIdParamFromFilter,
  selectAccountIdParamFromFilter,
  genericBalanceIncludingStakingByFilter,
)((_s: ReduxState, filter) => `${filter?.accountId ?? 'accountId'}-${filter?.assetId ?? 'assetId'}`)

export const selectCryptoHumanBalanceIncludingStakingByFilter = createCachedSelector(
  selectPortfolioAccountsCryptoHumanBalancesIncludingStaking,
  selectAssetIdParamFromFilter,
  selectAccountIdParamFromFilter,
  genericBalanceIncludingStakingByFilter,
)((_s: ReduxState, filter) => `${filter?.accountId ?? 'accountId'}-${filter?.assetId ?? 'assetId'}`)

export const selectPortfolioTotalChainIdBalanceIncludeStaking = createCachedSelector(
  selectPortfolioAccountsUserCurrencyBalancesIncludingStaking,
  selectChainIdParamFromFilter,
  (userCurrencyAccountBalances, chainId): string => {
    return Object.entries(userCurrencyAccountBalances)
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

export const selectPortfolioTotalBalanceByChainIdIncludeStaking = createDeepEqualOutputSelector(
  selectPortfolioAccountsUserCurrencyBalancesIncludingStaking,
  (userCurrencyAccountBalances): Record<ChainId, BigNumber> => {
    return Object.entries(userCurrencyAccountBalances).reduce<Record<ChainId, BigNumber>>(
      (acc, [accountId, accountBalanceByAssetId]) => {
        const chainId = fromAccountId(accountId).chainId
        if (!acc[chainId]) acc[chainId] = bn(0)
        Object.values(accountBalanceByAssetId).forEach(assetBalance => {
          // use the outer accumulator
          acc[chainId] = acc[chainId].plus(bnOrZero(assetBalance))
        })
        return acc
      },
      {},
    )
  },
)

export const selectPortfolioAccountBalanceByAccountNumberAndChainId = createCachedSelector(
  selectPortfolioAccountsUserCurrencyBalancesIncludingStaking,
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
    `${filter?.accountNumber ?? 'accountNumber'}-${filter?.chainId ?? 'chainId'}`,
)

export type PortfolioAccountIdByNumberByChainId = {
  [accountNumber: number]: { [chainId: ChainId]: AccountId }
}

export const selectPortfolioAccountIdByNumberByChainId = createDeepEqualOutputSelector(
  selectPortfolioAccountMetadata,
  (accountMetadata): PortfolioAccountIdByNumberByChainId => {
    return Object.keys(accountMetadata).reduce<PortfolioAccountIdByNumberByChainId>(
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
  selectPortfolioAccountsUserCurrencyBalancesIncludingStaking,
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
  selectPortfolioAssetAccountBalancesSortedUserCurrency,
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
)(
  (state: ReduxState, filter) =>
    `${state.portfolio.connectedWallet?.id ?? 'connectedWallet.id'}-${
      filter?.assetId ?? 'assetId'
    }`,
)

export const selectAccountIdsByChainId = createDeepEqualOutputSelector(
  selectPortfolioAccounts,
  (accounts): Record<ChainId, AccountId[] | undefined> =>
    Object.keys(accounts).reduce<Record<ChainId, AccountId[]>>((acc, accountId) => {
      const chainId = fromAccountId(accountId).chainId
      if (!acc[chainId]) acc[chainId] = []
      acc[chainId]!.push(accountId)
      return acc
    }, {}),
)

export const selectAccountIdsByChainIdFilter = createCachedSelector(
  selectAccountIdsByChainId,
  selectChainIdParamFromFilter,
  (accountIdsByChainId, chainId): AccountId[] => {
    if (!chainId) return []
    return accountIdsByChainId[chainId] ?? []
  },
)(
  (state: ReduxState, filter) =>
    `${state.portfolio.connectedWallet?.id ?? 'connectedWallet.id'}-${
      filter?.chainId ?? 'chainId'
    }`,
)

export const selectAccountIdsByAssetIdAboveBalanceThreshold = createCachedSelector(
  selectPortfolioAccounts,
  selectAssetIdParamFromFilter,
  selectPortfolioUserCurrencyBalancesByAccountId,
  selectBalanceThreshold,
  (portfolioAccounts, assetId, accountBalances, balanceThreshold) => {
    const accounts = findAccountsByAssetId(portfolioAccounts, assetId)
    const aboveThreshold = Object.entries(accountBalances).reduce<AccountId[]>(
      (acc, [accountId, balanceObj]) => {
        if (accounts.includes(accountId)) {
          const totalAccountUserCurrencyBalance = Object.values(balanceObj ?? {}).reduce(
            (totalBalance, currentBalance) => {
              return bnOrZero(bn(totalBalance).plus(bnOrZero(currentBalance)))
            },
            bnOrZero('0'),
          )
          if (totalAccountUserCurrencyBalance.lt(bnOrZero(balanceThreshold))) return acc
          acc.push(accountId)
        }
        return acc
      },
      [],
    )
    return aboveThreshold
  },
)(
  (state: ReduxState, filter) =>
    `${state.portfolio.connectedWallet?.id ?? 'connectedWallet.id'}-${
      filter?.assetId ?? 'assetId'
    }`,
)

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
  icon: string | undefined
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
  selectMarketDataUserCurrency,
  selectPortfolioAssetBalancesBaseUnit,
  selectPortfolioTotalUserCurrencyBalance,
  selectBalanceThreshold,
  (
    assetsById,
    marketData,
    balances,
    totalPortfolioUserCurrencyBalance,
    balanceThreshold,
  ): AccountRowData[] => {
    const assetRows = Object.entries(balances).reduce<AccountRowData[]>(
      (acc, [assetId, baseUnitBalance]) => {
        const asset = assetsById[assetId]
        if (!asset) return acc
        const { name, icon, symbol, precision } = asset
        const price = marketData[assetId]?.price ?? '0'
        const cryptoAmount = fromBaseUnit(baseUnitBalance, precision)
        const userCurrencyAmount = bnOrZero(cryptoAmount).times(bnOrZero(price))
        /**
         * if fiatAmount is less than the selected threshold,
         * continue to the next asset balance by returning acc
         */
        if (userCurrencyAmount.lt(bnOrZero(balanceThreshold))) return acc
        const allocation = bnOrZero(userCurrencyAmount.toFixed(2))
          .div(bnOrZero(totalPortfolioUserCurrencyBalance))
          .times(100)
          .toNumber()
        const priceChange = marketData[assetId]?.changePercent24Hr ?? 0
        const data = {
          assetId,
          name,
          icon,
          symbol,
          fiatAmount: userCurrencyAmount.toFixed(2),
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

export const selectPortfolioAnonymized = createDeepEqualOutputSelector(
  selectAssets,
  selectWalletId,
  selectWalletName,
  selectPortfolioUserCurrencyBalances,
  selectPortfolioAssetBalancesBaseUnit,
  (
    assetsById,
    walletId,
    walletName = '',
    portfolioUserCurrencyBalances,
    portfolioCryptoBalances,
  ): AnonymizedPortfolio => {
    const hashedWalletId = hashCode(walletId || '')

    type AssetBalances = Record<string, number>
    type ChainBalances = Record<string, number>

    const [assetBalances, chainBalances, portfolioBalanceBN] = Object.entries(
      portfolioUserCurrencyBalances,
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
  selectEnabledWalletAccountIds,
  selectPortfolioAccountMetadata,
  (walletAccountIds, accountMetadata): PartialRecord<number, PartialRecord<ChainId, AccountId>> => {
    const result: PartialRecord<number, PartialRecord<ChainId, AccountId>> = {}

    for (const accountId of walletAccountIds) {
      const { chainId } = fromAccountId(accountId)
      const { accountNumber } = accountMetadata[accountId].bip44Params

      const entry = result[accountNumber]

      if (entry === undefined) {
        result[accountNumber] = { [chainId]: accountId }
      } else {
        entry[chainId] = accountId
      }
    }

    return result
  },
)

export const selectAssetEquityItemsByFilter = createDeepEqualOutputSelector(
  selectAccountIdsByAssetIdAboveBalanceThresholdByFilter,
  selectPortfolioUserCurrencyBalancesByAccountId,
  selectPortfolioAccountBalancesBaseUnit,
  selectAllEarnUserLpOpportunitiesByFilter,
  selectAllEarnUserStakingOpportunitiesByFilter,
  selectAssets,
  selectMarketDataUserCurrency,
  selectAssetIdParamFromFilter,
  selectGetReadOnlyOpportunities,
  (
    accountIds,
    portfolioUserCurrencyBalances,
    portfolioCryptoBalancesBaseUnit,
    lpOpportunities,
    stakingOpportunities,
    assets,
    marketDataUserCurrency,
    assetId,
    readOnlyOpportunities,
  ): AssetEquityItem[] => {
    if (!assetId) return []
    const asset = assets[assetId]
    const accounts = accountIds.map(accountId => {
      const amountUserCurrency = bnOrZero(
        portfolioUserCurrencyBalances?.[accountId]?.[assetId],
      ).toString()
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
        amountUserCurrency,
        provider: 'wallet',
        amountCryptoPrecision,
        color: asset?.color,
      }
    })
    const staking = stakingOpportunities.map(stakingOpportunity => {
      const { amountCryptoPrecision, amountUserCurrency } = (() => {
        const underlyingAssetIndex = stakingOpportunity.underlyingAssetIds.findIndex(
          assetId => assetId === asset?.assetId,
        )
        const underlyingAssetPrecision =
          assets[stakingOpportunity.assetId]?.precision ?? asset?.precision

        const totalCryptoAmountPrecision = fromBaseUnit(
          bnOrZero(stakingOpportunity.cryptoAmountBaseUnit),
          underlyingAssetPrecision ?? 0,
        )

        const underlyingAssetAmountCryptobaseUnit = bnOrZero(totalCryptoAmountPrecision)
          .multipliedBy(stakingOpportunity.underlyingAssetRatiosBaseUnit[underlyingAssetIndex])
          .toFixed()

        const underlyingAssetAmountCryptoPrecision = fromBaseUnit(
          bnOrZero(underlyingAssetAmountCryptobaseUnit),
          asset?.precision ?? 0,
        )

        if (!stakingOpportunity.underlyingAssetWeightPercentageDecimal) {
          return {
            amountCryptoPrecision: underlyingAssetAmountCryptoPrecision,
            amountUserCurrency: stakingOpportunity.fiatAmount,
          }
        }

        return {
          amountCryptoPrecision: underlyingAssetAmountCryptoPrecision,
          amountUserCurrency: bnOrZero(stakingOpportunity.fiatAmount)
            .multipliedBy(
              stakingOpportunity.underlyingAssetWeightPercentageDecimal[underlyingAssetIndex],
            )
            .toFixed(),
        }
      })()

      return {
        id: stakingOpportunity.id,
        type: AssetEquityType.Staking,
        amountUserCurrency,
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
        marketDataUserCurrency,
      })
      return {
        id: lpOpportunity.id,
        type: AssetEquityType.LP,
        amountUserCurrency: underlyingBalances[assetId].fiatAmount,
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
      .sort((a, b) => bnOrZero(b.amountUserCurrency).minus(a.amountUserCurrency).toNumber())
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
        fiatAmount: bnOrZero(item.amountUserCurrency).plus(bnOrZero(sum.fiatAmount)).toString(),
        amountCryptoPrecision: bnOrZero(item.amountCryptoPrecision)
          .plus(bnOrZero(sum.amountCryptoPrecision))
          .toString(),
      }),
      initial,
    )
  },
)

export const selectPortfolioHasWalletId = createSelector(
  (state: ReduxState) => state.portfolio.wallet.ids,
  (_state: ReduxState, walletId: WalletId) => walletId,
  (storeWalletIds, walletId): boolean => storeWalletIds.includes(walletId),
)

export const selectPortfolioUserCurrencyTotalBalancesIncludingStakingByChainId =
  createDeepEqualOutputSelector(
    selectPortfolioAccountsUserCurrencyBalancesIncludingStaking,
    portfolioAccountsUserCurrencyBalancesIncludingStaking => {
      return Object.entries(portfolioAccountsUserCurrencyBalancesIncludingStaking).reduce(
        (acc, [accountId, accountBalancesUserCurrencyByAssetId]) => {
          const { chainId } = fromAccountId(accountId)
          const totalBalanceUserCurrency = Object.values(
            accountBalancesUserCurrencyByAssetId,
          ).reduce((accountTotal, assetBalanceUserCurrency) => {
            return accountTotal.plus(bnOrZero(assetBalanceUserCurrency))
          }, bn(0))

          acc[chainId] = bnOrZero(acc[chainId]).plus(totalBalanceUserCurrency).toString()
          return acc
        },
        {} as Record<ChainId, string>,
      )
    },
  )

export const selectWalletConnectedChainIdsSorted = createDeepEqualOutputSelector(
  selectPortfolioUserCurrencyTotalBalancesIncludingStakingByChainId,
  portfolioTotalBalanceUserCurrencyByChainId => {
    const chainAdapterManager = getChainAdapterManager()

    return orderBy(
      Object.entries(portfolioTotalBalanceUserCurrencyByChainId).map(
        ([chainId, totalBalanceUserCurrency]) => {
          return {
            chainId,
            totalBalanceUserCurrency: Number(totalBalanceUserCurrency),
            chainName: chainAdapterManager.get(chainId)?.getDisplayName() ?? '',
          }
        },
      ),
      ['totalBalanceUserCurrency', 'chainName'],
      ['desc', 'asc'],
    ).map(({ chainId }) => chainId)
  },
)

export const selectIsAccountsMetadataLoading = (state: ReduxState) =>
  state.portfolio.isAccountsMetadataLoading
export const selectIsAccountMetadataLoadingByAccountId = (state: ReduxState) =>
  state.portfolio.isAccountMetadataLoadingByAccountId
export const selectIsAnyAccountMetadataLoadingForChainId = createSelector(
  selectIsAccountMetadataLoadingByAccountId,
  selectChainIdParamFromFilter,
  (isAccountMetadataLoadingByAccountId, chainId): boolean => {
    return Object.entries(isAccountMetadataLoadingByAccountId).some(
      ([accountId, isLoading]) => fromAccountId(accountId).chainId === chainId && isLoading,
    )
  },
)
export const selectIsAnyAccountMetadataLoadedForChainId = createSelector(
  selectIsAccountMetadataLoadingByAccountId,
  selectChainIdParamFromFilter,
  (isAccountMetadataLoadingByAccountId, chainId): boolean => {
    return Object.entries(isAccountMetadataLoadingByAccountId).some(
      ([accountId, isLoading]) => fromAccountId(accountId).chainId === chainId && !isLoading,
    )
  },
)
