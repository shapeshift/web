import { createSelector } from '@reduxjs/toolkit'
import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import { FEE_ASSET_IDS, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type {
  AccountMetadata,
  AccountMetadataById,
  Bip44Params,
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
import type { Row } from 'react-table'

import { selectAssets } from '../assetsSlice/selectors'
import {
  selectEnabledWalletAccountIds,
  selectPortfolioAccountBalancesBaseUnit,
  selectPortfolioAssetBalancesBaseUnit,
  selectPortfolioAssetBalancesBaseUnitIncludingZeroBalances,
  selectPortfolioUserCurrencyBalances,
  selectPortfolioUserCurrencyBalancesByAccountId,
  selectRelatedAssetIdsByAssetIdInclusive,
  selectWalletAccountIds,
  selectWalletId,
  selectWalletName,
} from '../common-selectors'
import { opportunities } from '../opportunitiesSlice/opportunitiesSlice'
import type { UserStakingId } from '../opportunitiesSlice/types'
import { deserializeUserStakingId } from '../opportunitiesSlice/utils'
import { preferences } from '../preferencesSlice/preferencesSlice'
import { portfolio } from './portfolioSlice'
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

import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import type { BigNumber, BN } from '@/lib/bignumber/bignumber'
import { bn, bnOrZero } from '@/lib/bignumber/bignumber'
import { isMobile } from '@/lib/globals'
import { fromBaseUnit } from '@/lib/math'
import { getMaybeCompositeAssetSymbol } from '@/lib/mixpanel/helpers'
import type { AnonymizedPortfolio } from '@/lib/mixpanel/types'
import { hashCode, isSome } from '@/lib/utils'
import { isValidAccountNumber } from '@/lib/utils/accounts'
import type { ReduxState } from '@/state/reducer'
import { createDeepEqualOutputSelector } from '@/state/selector-utils'
import {
  selectAccountIdParamFromFilter,
  selectAccountNumberParamFromFilter,
  selectAssetIdParamFromFilter,
  selectChainIdParamFromFilter,
} from '@/state/selectors'
import { selectMarketDataUserCurrency } from '@/state/slices/marketDataSlice/selectors'
import { selectUserStakingOpportunitiesById } from '@/state/slices/opportunitiesSlice/selectors/stakingSelectors'
import {
  genericBalanceByFilter,
  getFirstAccountIdByChainId,
  getHighestUserCurrencyBalanceAccountByAssetId,
} from '@/state/slices/portfolioSlice/utils'

export const selectPortfolioAccounts = createDeepEqualOutputSelector(
  selectEnabledWalletAccountIds,
  portfolio.selectors.selectAccountsById,
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
  portfolio.selectors.selectAccountMetadataById,
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

export const selectBip44ParamsByAccountId = createCachedSelector(
  selectPortfolioAccountMetadata,
  selectAccountIdParamFromFilter,
  (accountMetadata, accountId): Bip44Params | undefined =>
    accountId && accountMetadata[accountId]?.bip44Params,
)((_s: ReduxState, filter) => filter?.accountId ?? 'accountId')

export const selectAccountNumberByAccountId = createCachedSelector(
  selectBip44ParamsByAccountId,
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
    preferences.selectors.selectBalanceThresholdUserCurrency,
    selectPortfolioAccounts,
    selectAccountIdParamFromFilter,
    (
      assetsById,
      accountBalances,
      assetBalances,
      marketData,
      balanceThresholdUserCurrency,
      portfolioAccounts,
      accountId,
    ): AssetBalancesById => {
      const rawBalances = (accountId ? accountBalances[accountId] : assetBalances) ?? {}
      // includes delegation, redelegation, and undelegation balances
      const totalBalancesIncludingAllDelegationStates: AssetBalancesById = Object.values(
        portfolioAccounts,
      ).reduce((acc, _account) => {
        return acc
      }, cloneDeep(rawBalances))

      const aboveThresholdBalances = Object.entries(
        totalBalancesIncludingAllDelegationStates,
      ).reduce<Record<AssetId, string>>((acc, [assetId, baseUnitBalance]) => {
        const asset = assetsById[assetId]
        if (!asset) return acc
        const precision = asset.precision
        const price = marketData[assetId]?.price
        const cryptoValue = fromBaseUnit(bnOrZero(baseUnitBalance), precision)
        const assetUserCurrencyBalance = bnOrZero(cryptoValue).times(bnOrZero(price))
        if (assetUserCurrencyBalance.lt(bnOrZero(balanceThresholdUserCurrency))) return acc
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
  preferences.selectors.selectBalanceThresholdUserCurrency,
  (
    portfolioUserCurrencyAccountBalances,
    balanceThresholdUserCurrency,
  ): PortfolioAccountBalancesById => {
    return Object.entries(
      portfolioUserCurrencyAccountBalances,
    ).reduce<PortfolioAccountBalancesById>((acc, [accountId, assetBalanceObj]) => {
      const sortedAssetsByUserCurrencyBalances = Object.entries(assetBalanceObj ?? {})
        .sort(([_, a], [__, b]) => (bnOrZero(a).gte(bnOrZero(b)) ? -1 : 1))
        .reduce<{ [k: AssetId]: string }>((acc, [assetId, assetUserCurrencyBalance]) => {
          if (bnOrZero(assetUserCurrencyBalance).lt(bnOrZero(balanceThresholdUserCurrency)))
            return acc
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
  opportunities.selectors.selectStakingOpportunitiesById,
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
 * same PortfolioAccountBalancesById shape, but human crypto balances
 */
export const selectPortfolioAccountsHumanBalances = createDeepEqualOutputSelector(
  selectAssets,
  selectPortfolioAccountBalancesBaseUnit,
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

export const selectPortfolioAccountsUserCurrencyBalances = createDeepEqualOutputSelector(
  selectAssets,
  selectMarketDataUserCurrency,
  selectPortfolioAccountBalancesBaseUnit,
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

// TODO(gomes): we probably don't need this
export const selectUserCurrencyBalanceByFilter = createCachedSelector(
  selectPortfolioAccountsUserCurrencyBalances,
  selectAssetIdParamFromFilter,
  selectAccountIdParamFromFilter,
  genericBalanceByFilter,
)((_s: ReduxState, filter) => `${filter?.accountId ?? 'accountId'}-${filter?.assetId ?? 'assetId'}`)

// TODO(gomes): we probably don't need this
export const selectCryptoHumanBalanceFilter = createCachedSelector(
  selectPortfolioAccountsHumanBalances,
  selectAssetIdParamFromFilter,
  selectAccountIdParamFromFilter,
  genericBalanceByFilter,
)((_s: ReduxState, filter) => `${filter?.accountId ?? 'accountId'}-${filter?.assetId ?? 'assetId'}`)

export const selectPortfolioTotalChainIdBalanceUserCurrency = createDeepEqualOutputSelector(
  selectAssets,
  selectMarketDataUserCurrency,
  selectPortfolioAssetBalancesBaseUnit,
  selectChainIdParamFromFilter,
  (assetsById, marketData, balances, chainIdFilter) =>
    Object.entries(balances)
      .reduce<BN>((acc, [assetId, baseUnitBalance]) => {
        const { chainId } = fromAssetId(assetId)
        if (chainId !== chainIdFilter) return acc

        const asset = assetsById[assetId]
        const precision = asset?.precision
        if (!precision) return acc

        const price = marketData[assetId]?.price
        const cryptoValue = fromBaseUnit(baseUnitBalance, precision)
        const assetUserCurrencyBalance = bnOrZero(cryptoValue).times(bnOrZero(price))

        acc = acc.plus(assetUserCurrencyBalance)
        return acc
      }, bn(0))
      .toFixed(2),
)

export const selectPortfolioTotalBalanceByChainIdIncludeStaking = createDeepEqualOutputSelector(
  selectPortfolioAccountsUserCurrencyBalances,
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
  selectPortfolioAccountsUserCurrencyBalances,
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
  selectPortfolioAccountsUserCurrencyBalances,
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
  preferences.selectors.selectBalanceThresholdUserCurrency,
  (accountAssets, accountId, assets, balanceThresholdUserCurrency): AssetId[] => {
    if (!accountId) return []
    const assetsByAccountIds = accountAssets?.[accountId] ?? {}
    return Object.entries(assetsByAccountIds)
      .filter(
        ([assetId, assetFiatBalance]) =>
          !FEE_ASSET_IDS.includes(assetId) &&
          assets[assetId] &&
          bnOrZero(assetFiatBalance).gte(bnOrZero(balanceThresholdUserCurrency)),
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
      acc[chainId].push(accountId)
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
  preferences.selectors.selectBalanceThresholdUserCurrency,
  (portfolioAccounts, assetId, accountBalances, balanceThresholdUserCurrency) => {
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
          if (totalAccountUserCurrencyBalance.lt(bnOrZero(balanceThresholdUserCurrency))) return acc
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

export type AccountRowProps = Row<AccountRowData>

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
  relatedAssetKey: string | null | undefined
  isChainSpecific: boolean
  isPrimary: boolean
}

export type GroupedAssetBalance = {
  primaryAsset: AccountRowData
  relatedAssets: AccountRowData[]
}

export const selectPortfolioAccountRows = createDeepEqualOutputSelector(
  selectAssets,
  selectMarketDataUserCurrency,
  selectPortfolioAssetBalancesBaseUnitIncludingZeroBalances,
  selectPortfolioTotalUserCurrencyBalance,
  (assetsById, marketData, balances, totalPortfolioUserCurrencyBalance): AccountRowData[] => {
    const assetRows = Object.entries(balances).reduce<AccountRowData[]>(
      (acc, [assetId, baseUnitBalance]) => {
        const asset = assetsById[assetId]
        if (!asset) return acc
        const { name, icon, symbol, precision } = asset
        const price = marketData[assetId]?.price ?? '0'
        const cryptoAmount = fromBaseUnit(baseUnitBalance, precision)
        const userCurrencyAmount = bnOrZero(cryptoAmount).times(bnOrZero(price))
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
          relatedAssetKey: asset.relatedAssetKey,
          isChainSpecific: asset.isChainSpecific ?? false,
          isPrimary: asset.isPrimary ?? false,
        }
        acc.push(data)
        return acc
      },
      [],
    )
    return assetRows
  },
)

export const selectPrimaryPortfolioAccountRowsSortedByBalance = createDeepEqualOutputSelector(
  selectPortfolioAccountRows,
  selectPortfolioAccountBalancesBaseUnit,
  selectAssets,
  selectMarketDataUserCurrency,
  selectRelatedAssetIdsByAssetIdInclusive,
  preferences.selectors.selectBalanceThresholdUserCurrency,
  (
    portfolioAccountRows,
    accountBalancesById,
    assets,
    marketData,
    relatedAssetIdsByAssetId,
    balanceThresholdUserCurrency,
  ): AccountRowData[] => {
    const primaryAccountRows = portfolioAccountRows.filter(row => row.isPrimary)

    const primaryAccountRowsWithAggregatedBalances = primaryAccountRows.reduce<AccountRowData[]>(
      (acc, { assetId: primaryAssetId }) => {
        const primaryAsset = assets[primaryAssetId]
        const allRelatedAssetIds = relatedAssetIdsByAssetId[primaryAssetId]

        let totalCryptoBalance = bnOrZero(0)

        Object.values(accountBalancesById).forEach(accountBalances => {
          allRelatedAssetIds.forEach(relatedAssetId => {
            const relatedAsset = assets[relatedAssetId]
            const balance = accountBalances[relatedAssetId]
            const cryptoBalance = fromBaseUnit(bnOrZero(balance), relatedAsset?.precision ?? 0)

            if (cryptoBalance) {
              totalCryptoBalance = totalCryptoBalance.plus(bnOrZero(cryptoBalance))
            }
          })
        })

        const price = marketData[primaryAssetId]?.price ?? '0'
        const userCurrencyAmount = bnOrZero(totalCryptoBalance).times(bnOrZero(price))

        if (userCurrencyAmount.lt(bnOrZero(balanceThresholdUserCurrency))) return acc

        const primaryAccountRow: AccountRowData = {
          assetId: primaryAssetId,
          name: primaryAsset?.name ?? '',
          icon: primaryAsset?.icon ?? '',
          symbol: primaryAsset?.symbol ?? '',
          fiatAmount: userCurrencyAmount.toFixed(2),
          cryptoAmount: totalCryptoBalance.toFixed(),
          // @TODO: We probably don't need this anymore as we will remove balance chart
          allocation: 0,
          price,
          priceChange: marketData[primaryAssetId]?.changePercent24Hr ?? 0,
          relatedAssetKey: primaryAsset?.relatedAssetKey,
          isChainSpecific: primaryAsset?.isChainSpecific ?? false,
          isPrimary: primaryAsset?.isPrimary ?? false,
        }

        acc.push(primaryAccountRow)

        return acc
      },
      [],
    )

    return primaryAccountRowsWithAggregatedBalances.sort((a, b) =>
      bnOrZero(b.fiatAmount).minus(bnOrZero(a.fiatAmount)).toNumber(),
    )
  },
)

export const selectGroupedAssetsWithBalances = createCachedSelector(
  selectPortfolioAccountRows,
  selectRelatedAssetIdsByAssetIdInclusive,
  selectAssets,
  selectMarketDataUserCurrency,
  (_state: ReduxState, primaryAssetId: AssetId) => primaryAssetId,
  (
    accountRows,
    relatedAssetIdsByAssetId,
    assetsById,
    marketData,
    primaryAssetId,
  ): GroupedAssetBalance | null => {
    const primaryAsset = assetsById[primaryAssetId]
    const primaryRow = accountRows.find(row => row.assetId === primaryAssetId) ?? {
      assetId: primaryAssetId,
      name: primaryAsset?.name ?? '',
      icon: primaryAsset?.icon ?? '',
      symbol: primaryAsset?.symbol ?? '',
      fiatAmount: '0',
      cryptoAmount: '0',
      allocation: 0,
      price: marketData[primaryAssetId]?.price ?? '0',
      priceChange: marketData[primaryAssetId]?.changePercent24Hr ?? 0,
      relatedAssetKey: assetsById[primaryAssetId]?.relatedAssetKey ?? null,
      isChainSpecific: primaryAsset?.isChainSpecific ?? false,
      isPrimary: primaryAsset?.isPrimary ?? false,
    }

    const allRelatedAssetIds = relatedAssetIdsByAssetId[primaryAssetId] || []
    const relatedAssets = allRelatedAssetIds
      .map(assetId => {
        const row = accountRows.find(row => row.assetId === assetId)
        const asset = assetsById[assetId]

        if (!row && !asset) return null

        if (!row)
          return {
            assetId,
            name: asset?.name ?? '',
            icon: asset?.icon ?? '',
            symbol: asset?.symbol ?? '',
            fiatAmount: '0',
            cryptoAmount: '0',
            allocation: 0,
            price: marketData[assetId]?.price ?? '0',
            priceChange: marketData[assetId]?.changePercent24Hr ?? 0,
            relatedAssetKey: asset?.relatedAssetKey ?? null,
            isChainSpecific: asset?.isChainSpecific ?? false,
            isPrimary: asset?.isPrimary ?? false,
          }

        return row
      })
      .filter(isSome)
      .sort((a, b) => bnOrZero(b.fiatAmount).minus(bnOrZero(a.fiatAmount)).toNumber())

    const totalFiatBalance = allRelatedAssetIds
      .reduce((sum, assetId) => {
        const row = accountRows.find(row => row.assetId === assetId)
        return sum.plus(row?.fiatAmount ?? '0')
      }, bnOrZero(0))
      .toFixed(2)

    const totalCryptoBalance = allRelatedAssetIds
      .reduce((sum, assetId) => {
        const row = accountRows.find(row => row.assetId === assetId)
        return sum.plus(row?.cryptoAmount ?? '0')
      }, bnOrZero(0))
      .toFixed()

    return {
      primaryAsset: {
        ...primaryRow,
        fiatAmount: totalFiatBalance,
        cryptoAmount: totalCryptoBalance,
      },
      relatedAssets,
    }
  },
)((_state: ReduxState, primaryAssetId: AssetId) => primaryAssetId)

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

export const selectAccountIdsByAccountNumberAndChainId = createSelector(
  selectEnabledWalletAccountIds,
  selectPortfolioAccountMetadata,
  (
    walletAccountIds,
    accountMetadata,
  ): PartialRecord<number, PartialRecord<ChainId, AccountId[]>> => {
    const result: PartialRecord<number, PartialRecord<ChainId, AccountId[]>> = {}

    for (const accountId of walletAccountIds) {
      const { chainId } = fromAccountId(accountId)
      const { accountNumber } = accountMetadata[accountId].bip44Params

      const entry = result[accountNumber]

      if (entry === undefined) {
        result[accountNumber] = { [chainId]: [accountId] }
      } else {
        entry[chainId] = [...(entry[chainId] ?? []), accountId]
      }
    }

    return result
  },
)

export const selectAssetEquityItemsByFilter = createDeepEqualOutputSelector(
  selectAccountIdsByAssetIdAboveBalanceThresholdByFilter,
  selectPortfolioUserCurrencyBalancesByAccountId,
  selectPortfolioAccountBalancesBaseUnit,
  selectAssets,
  selectAssetIdParamFromFilter,
  (
    accountIds,
    portfolioUserCurrencyBalances,
    portfolioCryptoBalancesBaseUnit,
    assets,
    assetId,
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

    return accounts.sort((a, b) =>
      bnOrZero(b.amountUserCurrency).minus(a.amountUserCurrency).toNumber(),
    )
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
  portfolio.selectors.selectWalletIds,
  (_state: ReduxState, walletId: WalletId) => walletId,
  (storeWalletIds, walletId): boolean => storeWalletIds.includes(walletId),
)

export const selectPortfolioUserCurrencyTotalBalancesByChainId = createDeepEqualOutputSelector(
  selectPortfolioAccountsUserCurrencyBalances,
  portfolioAccountsUserCurrencyBalances => {
    return Object.entries(portfolioAccountsUserCurrencyBalances).reduce(
      (acc, [accountId, accountBalancesUserCurrencyByAssetId]) => {
        const { chainId } = fromAccountId(accountId)
        const totalBalanceUserCurrency = Object.values(accountBalancesUserCurrencyByAssetId).reduce(
          (accountTotal, assetBalanceUserCurrency) => {
            return accountTotal.plus(bnOrZero(assetBalanceUserCurrency))
          },
          bn(0),
        )

        acc[chainId] = bnOrZero(acc[chainId]).plus(totalBalanceUserCurrency).toString()
        return acc
      },
      {} as Record<ChainId, string>,
    )
  },
)

export const selectWalletConnectedChainIdsSorted = createDeepEqualOutputSelector(
  selectPortfolioUserCurrencyTotalBalancesByChainId,
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

export const selectIsAnyGetAccountPortfolioLoadedForChainId = createSelector(
  portfolio.selectors.selectIsPortfolioGetAccountLoadingByAccountId,
  selectChainIdParamFromFilter,
  (isPortfolioGetAccountLoadingByAccountId, chainId): boolean => {
    return Object.entries(isPortfolioGetAccountLoadingByAccountId).some(
      ([accountId, isLoading]) => fromAccountId(accountId).chainId === chainId && !isLoading,
    )
  },
)

export const selectIsAnyPortfolioGetAccountLoading = createSelector(
  portfolio.selectors.selectIsPortfolioGetAccountLoadingByAccountId,
  (isPortfolioGetAccountLoadingByAccountId): boolean => {
    return Object.values(isPortfolioGetAccountLoadingByAccountId).some(isLoading => isLoading)
  },
)

// For a given account number, find the first EVM AccountId (they're all the same address) so we can get an address from a given account number
export const selectEvmAddressByAccountNumber = createCachedSelector(
  selectAccountIdsByAccountNumberAndChainId,
  selectAccountNumberParamFromFilter,
  (accountIdsByAccountNumberAndChainId, accountNumber): string | null => {
    if (accountNumber === undefined) return null

    const accountsByChain = accountIdsByAccountNumberAndChainId[accountNumber]
    if (!accountsByChain) return null

    // Find first EVM account ID - all EVM accounts for same account number share the same address
    for (const [chainId, accountIds] of Object.entries(accountsByChain)) {
      if (isEvmChainId(chainId) && accountIds?.[0]) {
        return fromAccountId(accountIds[0]).account
      }
    }

    return null
  },
)((_s: ReduxState, filter) => filter?.accountNumber ?? 'accountNumber')

// Get unique account numbers that have at least one EVM account
export const selectUniqueEvmAccountNumbers = createSelector(
  selectAccountIdsByAccountNumberAndChainId,
  accountIdsByAccountNumberAndChainId =>
    Object.keys(accountIdsByAccountNumberAndChainId)
      .map(Number)
      .filter(accountNumber =>
        Object.keys(accountIdsByAccountNumberAndChainId[accountNumber] ?? {}).some(isEvmChainId),
      )
      .sort((a, b) => a - b),
)
