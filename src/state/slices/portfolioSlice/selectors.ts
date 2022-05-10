import { createSelector } from '@reduxjs/toolkit'
import { AccountId, AssetId } from '@shapeshiftoss/caip'
import { Asset } from '@shapeshiftoss/types'
import difference from 'lodash/difference'
import flow from 'lodash/flow'
import head from 'lodash/head'
import keys from 'lodash/keys'
import map from 'lodash/map'
import size from 'lodash/size'
import toLower from 'lodash/toLower'
import uniq from 'lodash/uniq'
import { createCachedSelector } from 're-reselect'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import { selectAssets } from 'state/slices/assetsSlice/selectors'
import { selectMarketData } from 'state/slices/marketDataSlice/selectors'
import { selectBalanceThreshold } from 'state/slices/preferencesSlice/selectors'
import {
  selectTotalStakingDelegationCryptoByFilter,
  selectTotalStakingDelegationFiat,
} from 'state/slices/stakingDataSlice/selectors'

import { AccountSpecifier } from '../accountSpecifiersSlice/accountSpecifiersSlice'
import { PubKey } from '../validatorDataSlice/validatorDataSlice'
import { selectAccountSpecifiers } from './../accountSpecifiersSlice/selectors'
import {
  PortfolioAccountBalances,
  PortfolioAccountSpecifiers,
  PortfolioAssetBalances,
  PortfolioAssets,
  PortfolioBalancesById,
} from './portfolioSliceCommon'
import {
  assetIdToChainId,
  findAccountsByAssetId,
  makeBalancesByChainBucketsFlattened,
  makeSortedAccountBalances,
} from './utils'

type ParamFilter = {
  assetId: AssetId
  accountId: AccountSpecifier
  accountSpecifier: string
  validatorAddress: PubKey
}
type OptionalParamFilter = {
  assetId: AssetId
  accountId?: AccountSpecifier
  accountSpecifier?: string
  validatorAddress?: PubKey
}
type ParamFilterKey = keyof ParamFilter
type OptionalParamFilterKey = keyof OptionalParamFilter

const selectParamFromFilter =
  <T extends ParamFilterKey>(param: T) =>
  (_state: ReduxState, filter: Pick<ParamFilter, T>): ParamFilter[T] =>
    filter[param]
const selectParamFromFilterOptional =
  <T extends OptionalParamFilterKey>(param: T) =>
  (_state: ReduxState, filter: Pick<OptionalParamFilter, T>): OptionalParamFilter[T] =>
    filter[param]
// We should prob change this once we add more chains
const FEE_ASSET_IDS = [
  'eip155:1/slip44:60',
  'bip122:000000000019d6689c085ae165831e93/slip44:0',
  'cosmos:cosmoshub-4/slip44:118',
  'cosmos:osmosis-1/slip44:118',
]

export const selectPortfolioAssetIds = createDeepEqualOutputSelector(
  (state: ReduxState): PortfolioAssetBalances['ids'] => state.portfolio.assetBalances.ids,
  ids => ids,
)
export const selectPortfolioAssetBalances = (state: ReduxState): PortfolioAssetBalances['byId'] =>
  state.portfolio.assetBalances.byId
export const selectAccountIds = (state: ReduxState): PortfolioAccountSpecifiers['byId'] =>
  state.portfolio.accountSpecifiers.byId
export const selectPortfolioAccountBalances = (
  state: ReduxState,
): PortfolioAccountBalances['byId'] => state.portfolio.accountBalances.byId

export const selectIsPortfolioLoaded = createSelector(
  selectAccountSpecifiers,
  selectPortfolioAssetIds,
  (accountSpecifiers, portfolioAssetIds) => {
    if (!accountSpecifiers.length) return false
    /**
     * for a given wallet - we can support 1 to n chains
     * AppContext ensures we will have a portfolioAssetId for each chain's fee asset
     * until the portfolioAssetIds includes supported chains fee assets, it's not fully loaded
     * the golf below ensures that's the case
     */

    return !size(
      difference(
        uniq(map(accountSpecifiers, flow([keys, head]))),
        uniq(map(portfolioAssetIds, assetIdToChainId)),
      ),
    )
  },
)

export const selectPortfolioFiatBalances = createSelector(
  selectAssets,
  selectMarketData,
  selectPortfolioAssetBalances,
  selectBalanceThreshold,
  (assetsById, marketData, balances, balanceThreshold) =>
    Object.entries(balances).reduce<PortfolioAssetBalances['byId']>(
      (acc, [assetId, baseUnitBalance]) => {
        const precision = assetsById[assetId]?.precision
        const price = marketData[assetId]?.price
        const cryptoValue = fromBaseUnit(baseUnitBalance, precision)
        const assetFiatBalance = bnOrZero(cryptoValue).times(bnOrZero(price))
        if (assetFiatBalance.lt(bnOrZero(balanceThreshold))) return acc
        acc[assetId] = assetFiatBalance.toFixed(2)
        return acc
      },
      {},
    ),
)

const selectAssetIdParamFromFilter = selectParamFromFilter('assetId')
const selectAccountIdParamFromFilter = selectParamFromFilter('accountId')

const selectAccountIdParamFromFilterOptional = selectParamFromFilterOptional('accountId')
const selectAccountSpecifierParamFromFilter = selectParamFromFilter('accountSpecifier')

export const selectPortfolioFiatAccountBalances = createSelector(
  selectAssets,
  selectPortfolioAccountBalances,
  selectMarketData,
  (assetsById, accounts, marketData) => {
    return Object.entries(accounts).reduce(
      (acc, [accountId, balanceObj]) => {
        acc[accountId] = Object.entries(balanceObj).reduce(
          (acc, [assetId, cryptoBalance]) => {
            const precision = assetsById[assetId]?.precision
            const price = marketData[assetId]?.price
            const cryptoValue = fromBaseUnit(cryptoBalance, precision)
            const fiatbalance = bnOrZero(bn(cryptoValue).times(price)).toFixed(2)
            acc[assetId] = fiatbalance

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

export const selectPortfolioTotalFiatBalanceWithDelegations = createSelector(
  selectPortfolioTotalFiatBalance,
  selectTotalStakingDelegationFiat,
  (portfolioFiatBalance, delegationFiatBalance): string =>
    bnOrZero(portfolioFiatBalance).plus(delegationFiatBalance).toString(),
)

export const selectPortfolioFiatBalanceByAssetId = createSelector(
  selectPortfolioFiatBalances,
  selectAssetIdParamFromFilter,
  (portfolioFiatBalances, assetId) => portfolioFiatBalances[assetId],
)

export const selectPortfolioFiatBalanceByFilter = createSelector(
  selectPortfolioFiatBalances,
  selectPortfolioFiatAccountBalances,
  selectAssetIdParamFromFilter,
  selectAccountIdParamFromFilterOptional,
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
)

export const selectPortfolioCryptoBalanceByAssetId = createSelector(
  selectPortfolioAssetBalances,
  selectAssetIdParamFromFilter,
  (byId, assetId): string => byId[assetId] ?? 0,
)

export const selectPortfolioCryptoHumanBalanceByFilter = createSelector(
  selectAssets,
  selectPortfolioAccountBalances,
  selectPortfolioAssetBalances,
  selectAccountIdParamFromFilterOptional,
  selectAssetIdParamFromFilter,
  (assets, accountBalances, assetBalances, accountId, assetId): string => {
    if (accountId && assetId) {
      return fromBaseUnit(
        bnOrZero(accountBalances?.[accountId]?.[assetId]),
        assets[assetId]?.precision ?? 0,
      )
    }

    return fromBaseUnit(bnOrZero(assetBalances[assetId]), assets[assetId]?.precision ?? 0)
  },
)

export const selectTotalFiatBalanceWithDelegations = createSelector(
  selectPortfolioCryptoHumanBalanceByFilter,
  selectTotalStakingDelegationCryptoByFilter,
  selectMarketData,
  selectAssetIdParamFromFilter,
  (cryptoBalance, delegationCryptoBalance, marketData, assetId): string => {
    const price = marketData[assetId]?.price
    const cryptoBalanceWithDelegations = bnOrZero(cryptoBalance)
      .plus(delegationCryptoBalance)
      .toString()

    return bnOrZero(cryptoBalanceWithDelegations).times(price).toString()
  },
)

export const selectTotalCryptoBalanceWithDelegations = createSelector(
  selectPortfolioCryptoHumanBalanceByFilter,
  selectTotalStakingDelegationCryptoByFilter,
  (cryptoBalance, delegationCryptoBalance): string => {
    const cryptoBalanceWithDelegations = bnOrZero(cryptoBalance)
      .plus(delegationCryptoBalance)
      .toString()

    return bnOrZero(cryptoBalanceWithDelegations).toString()
  },
)

export const selectPortfolioCryptoBalancesByAccountIdAboveThreshold = createDeepEqualOutputSelector(
  selectAssets,
  selectPortfolioAccountBalances,
  selectPortfolioAssetBalances,
  selectMarketData,
  selectBalanceThreshold,
  (_state: ReduxState, accountId?: string) => accountId,
  (
    assetsById,
    accountBalances,
    assetBalances,
    marketData,
    balanceThreshold,
    accountId,
  ): PortfolioBalancesById => {
    const balances = (accountId ? accountBalances[accountId] : assetBalances) ?? {}
    const aboveThresholdBalances = Object.entries(balances).reduce<PortfolioAssetBalances['byId']>(
      (acc, [assetId, baseUnitBalance]) => {
        const precision = assetsById[assetId]?.precision
        const price = marketData[assetId]?.price
        const cryptoValue = fromBaseUnit(baseUnitBalance, precision)
        const assetFiatBalance = bnOrZero(cryptoValue).times(bnOrZero(price))
        if (assetFiatBalance.lt(bnOrZero(balanceThreshold))) return acc
        // if it's above the threshold set the original object key and value to result
        acc[assetId] = baseUnitBalance
        return acc
      },
      {},
    )
    return aboveThresholdBalances
  },
)

export const selectPortfolioCryptoBalanceByFilter = createSelector(
  selectPortfolioAccountBalances,
  selectPortfolioAssetBalances,
  selectAccountIdParamFromFilterOptional,
  selectAssetIdParamFromFilter,
  (accountBalances, assetBalances, accountId, assetId): string => {
    if (accountId && assetId) {
      return accountBalances?.[accountId]?.[assetId] ?? '0'
    }
    return assetBalances[assetId] ?? '0'
  },
)

export const selectPortfolioCryptoHumanBalanceByAssetId = createCachedSelector(
  selectAssets,
  selectPortfolioAssetBalances,
  selectAssetIdParamFromFilter,
  (assets, balances, assetId): string =>
    fromBaseUnit(bnOrZero(balances[assetId]), assets[assetId]?.precision ?? 0),
)((_assets, _balances, assetId: AssetId): AssetId => assetId ?? 'undefined')

export const selectPortfolioMixedHumanBalancesBySymbol = createSelector(
  selectAssets,
  selectMarketData,
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

export const selectPortfolioAssets = createSelector(
  selectAssets,
  selectPortfolioAssetIds,
  (assetsById, portfolioAssetIds): { [k: AssetId]: Asset } =>
    portfolioAssetIds.reduce<PortfolioAssets>((acc, cur) => {
      acc[cur] = assetsById[cur]
      return acc
    }, {}),
)

export const selectPortfolioAccountIds = (state: ReduxState): AccountSpecifier[] =>
  state.portfolio.accounts.ids

// we only set ids when chain adapters responds, so if these are present, the portfolio has loaded
export const selectPortfolioLoading = createSelector(
  selectPortfolioAccountIds,
  (ids): boolean => !Boolean(ids.length),
)

export const selectPortfolioAssetBalancesSortedFiat = createSelector(
  selectPortfolioFiatBalances,
  (portfolioFiatBalances): { [k: AssetId]: string } =>
    Object.entries(portfolioFiatBalances)
      .sort(([_, a], [__, b]) => (bnOrZero(a).gte(bnOrZero(b)) ? -1 : 1))
      .reduce<PortfolioAssetBalances['byId']>((acc, [assetId, assetFiatBalance]) => {
        acc[assetId] = assetFiatBalance
        return acc
      }, {}),
)

export const selectPortfolioAssetAccountBalancesSortedFiat = createSelector(
  selectPortfolioFiatAccountBalances,
  selectBalanceThreshold,
  (
    portfolioFiatAccountBalances,
    balanceThreshold,
  ): { [k: AccountSpecifier]: { [k: AssetId]: string } } => {
    return Object.entries(portfolioFiatAccountBalances).reduce<{
      [k: AccountSpecifier]: { [k: AssetId]: string }
    }>((acc, [accountId, assetBalanceObj]) => {
      const sortedAssetsByFiatBalances = Object.entries(assetBalanceObj)
        .sort(([_, a], [__, b]) => (bnOrZero(a).gte(bnOrZero(b)) ? -1 : 1))
        .reduce<{ [k: AssetId]: string }>((acc, [assetId, assetFiatBalance]) => {
          if (bnOrZero(assetFiatBalance).lt(bnOrZero(balanceThreshold))) return acc
          acc[assetId] = assetFiatBalance
          return acc
        }, {})

      acc[accountId] = sortedAssetsByFiatBalances
      return acc
    }, {})
  },
)

export const selectPortfolioAssetIdsSortedFiat = createSelector(
  selectPortfolioAssetBalancesSortedFiat,
  (sortedBalances): AssetId[] => Object.keys(sortedBalances),
)

export const selectPortfolioAllocationPercent = createSelector(
  selectPortfolioTotalFiatBalance,
  selectPortfolioFiatBalances,
  (totalBalance, fiatBalances): { [k: AssetId]: number } =>
    Object.entries(fiatBalances).reduce<{ [k: AssetId]: number }>((acc, [assetId, fiatBalance]) => {
      acc[assetId] = bnOrZero(fiatBalance).div(bnOrZero(totalBalance)).times(100).toNumber()
      return acc
    }, {}),
)

export const selectPortfolioTotalFiatBalanceByAccount = createSelector(
  selectPortfolioFiatAccountBalances,
  selectBalanceThreshold,
  (accountBalances, balanceThreshold) => {
    return Object.entries(accountBalances).reduce<{ [k: AccountSpecifier]: string }>(
      (acc, [accountId, balanceObj]) => {
        const totalAccountFiatBalance = Object.values(balanceObj).reduce(
          (totalBalance, currentBalance) => {
            return bnOrZero(bn(totalBalance).plus(bn(currentBalance)))
          },
          bnOrZero('0'),
        )
        if (totalAccountFiatBalance.lt(bnOrZero(balanceThreshold))) return acc
        acc[accountId] = totalAccountFiatBalance.toFixed(2)
        return acc
      },
      {},
    )
  },
)

export const selectPortfolioAllocationPercentByFilter = createSelector(
  selectPortfolioFiatBalances,
  selectPortfolioFiatAccountBalances,
  selectAccountIdParamFromFilter,
  selectAssetIdParamFromFilter,
  (assetFiatBalances, assetFiatBalancesByAccount, accountId, assetId) => {
    const totalAssetFiatBalance = assetFiatBalances[assetId]
    const balanceAllocationById = Object.entries(assetFiatBalancesByAccount).reduce<{
      [k: AccountSpecifier]: number
    }>((acc, [currentAccountId, assetAccountFiatBalance]) => {
      const allocation = bnOrZero(
        bn(assetAccountFiatBalance[assetId]).div(totalAssetFiatBalance).times(100),
      ).toNumber()

      acc[currentAccountId] = allocation
      return acc
    }, {})

    return balanceAllocationById[accountId]
  },
)

export const selectPortfolioAccountIdsSortedFiat = createDeepEqualOutputSelector(
  selectPortfolioTotalFiatBalanceByAccount,
  selectAssets,
  (totalAccountBalances, assets) => {
    const sortedAccountBalances = makeSortedAccountBalances(totalAccountBalances)
    const sortedAccountBalancesByChainBuckets = makeBalancesByChainBucketsFlattened(
      sortedAccountBalances,
      assets,
    )
    return sortedAccountBalancesByChainBuckets
  },
)

export const selectPortfolioIsEmpty = createSelector(
  selectPortfolioAssetIds,
  (assetIds): boolean => !assetIds.length,
)

export const selectPortfolioAccounts = (state: ReduxState) => state.portfolio.accounts.byId

export const selectPortfolioAssetAccounts = createSelector(
  selectPortfolioAccounts,
  (_state: ReduxState, assetId: AssetId) => assetId,
  (portfolioAccounts, assetId): AccountSpecifier[] =>
    Object.keys(portfolioAccounts).filter(accountSpecifier =>
      portfolioAccounts[accountSpecifier].find(accountAssetId => accountAssetId === assetId),
    ),
)

export const selectPortfolioAccountById = createSelector(
  selectPortfolioAccounts,
  (_state: ReduxState, accountId: AccountSpecifier) => accountId,
  (portfolioAccounts, accountId) => portfolioAccounts[accountId],
)

export const selectPortfolioAssetIdsByAccountId = createSelector(
  selectPortfolioAccountBalances,
  selectAccountIdParamFromFilter,
  (accounts, accountId) => Object.keys(accounts[accountId]),
)

// @TODO: remove this assets check once we filter the portfolio on the way in
export const selectPortfolioAssetIdsByAccountIdExcludeFeeAsset = createDeepEqualOutputSelector(
  selectPortfolioAssetAccountBalancesSortedFiat,
  selectAccountIdParamFromFilter,
  selectAssets,
  selectBalanceThreshold,
  (accountAssets, accountId, assets, balanceThreshold) => {
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
)

export const selectAccountIdByAddress = createSelector(
  selectAccountIds,
  selectAccountSpecifierParamFromFilter,
  (portfolioAccounts: { [k: AccountSpecifier]: AccountId[] }, caip10): string => {
    let accountSpecifier = ''
    for (const accountId in portfolioAccounts) {
      const isAccountSpecifier = !!portfolioAccounts[accountId].find(
        acctCaip10 => toLower(acctCaip10) === toLower(caip10),
      )
      if (isAccountSpecifier) {
        accountSpecifier = accountId
        break
      }
    }
    return accountSpecifier
  },
)

export const selectAccountIdsByAssetId = createSelector(
  selectPortfolioAccounts,
  selectAssetIdParamFromFilter,
  findAccountsByAssetId,
)

export const selectAccountIdsByAssetIdAboveBalanceThreshold = createDeepEqualOutputSelector(
  selectPortfolioAccounts,
  selectAssetIdParamFromFilter,
  selectPortfolioFiatAccountBalances,
  selectBalanceThreshold,
  (portfolioAccounts, assetId, accountBalances, balanceThreshold) => {
    const accounts = findAccountsByAssetId(portfolioAccounts, assetId)
    const aboveThreshold = Object.entries(accountBalances).reduce<AccountSpecifier[]>(
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
)

export type AccountRowData = {
  name: string
  icon: string
  symbol: string
  fiatAmount: string
  cryptoAmount: string
  assetId: AccountSpecifier
  allocation: number
  price: string
  priceChange: number
}

export const selectPortfolioAccountRows = createDeepEqualOutputSelector(
  selectAssets,
  selectMarketData,
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
        const price = marketData[assetId]?.price
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
        const priceChange = marketData[assetId]?.changePercent24Hr
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
