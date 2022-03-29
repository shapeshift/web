import { createSelector } from '@reduxjs/toolkit'
import { CAIP10, CAIP19 } from '@shapeshiftoss/caip'
import { Asset } from '@shapeshiftoss/types'
import toLower from 'lodash/toLower'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import { selectAssets, selectBalanceThreshold, selectMarketData } from 'state/slices/selectors'

import { AccountSpecifier } from '../accountSpecifiersSlice/accountSpecifiersSlice'
import {
  PortfolioAccountBalances,
  PortfolioAccountSpecifiers,
  PortfolioAssetBalances,
  PortfolioAssets,
  PortfolioBalancesById
} from './portfolioSlice'
import { findAccountsByAssetId } from './utils'

// We should prob change this once we add more chains
const FEE_ASSET_IDS = ['eip155:1/slip44:60', 'bip122:000000000019d6689c085ae165831e93/slip44:0']

export const selectPortfolioAssetIds = createDeepEqualOutputSelector(
  (state: ReduxState): PortfolioAssetBalances['ids'] => state.portfolio.assetBalances.ids,
  ids => ids
)
export const selectPortfolioAssetBalances = (state: ReduxState): PortfolioAssetBalances['byId'] =>
  state.portfolio.assetBalances.byId
export const selectAccountIds = (state: ReduxState): PortfolioAccountSpecifiers['byId'] =>
  state.portfolio.accountSpecifiers.byId
export const selectPortfolioAccountBalances = (
  state: ReduxState
): PortfolioAccountBalances['byId'] => state.portfolio.accountBalances.byId

export const selectPortfolioFiatBalances = createSelector(
  selectAssets,
  selectMarketData,
  selectPortfolioAssetBalances,
  (assetsById, marketData, balances) =>
    Object.entries(balances).reduce<PortfolioAssetBalances['byId']>(
      (acc, [assetId, baseUnitBalance]) => {
        const precision = assetsById[assetId]?.precision
        const price = marketData[assetId]?.price
        const cryptoValue = fromBaseUnit(baseUnitBalance, precision)
        const assetFiatBalance = bnOrZero(cryptoValue).times(bnOrZero(price)).toFixed(2)
        acc[assetId] = assetFiatBalance
        return acc
      },
      {}
    )
)

// accountId is optional, but we should always pass an assetId when using these params
type OptionalParamFilter = {
  assetId: CAIP19
  accountId?: AccountSpecifier
}

type ParamFilter = {
  assetId: CAIP19
  accountId: AccountSpecifier
}

const selectAssetIdParam = (_state: ReduxState, id: CAIP19) => id
const selectAssetIdParamFromFilter = (_state: ReduxState, paramFilter: ParamFilter) =>
  paramFilter.assetId
const selectAccountIdParamFromFilter = (_state: ReduxState, paramFilter: ParamFilter) =>
  paramFilter.accountId

const selectAssetIdParamFromFilterOptional = (
  _state: ReduxState,
  paramFilter: OptionalParamFilter
) => paramFilter.assetId
const selectAccountIdParamFromFilterOptional = (
  _state: ReduxState,
  paramFilter: OptionalParamFilter
) => paramFilter.accountId

const selectAccountAddressParam = (_state: ReduxState, id: CAIP10) => id
const selectAccountIdParam = (_state: ReduxState, id: AccountSpecifier) => id

export const selectPortfolioFiatAccountBalances = createSelector(
  selectAssets,
  selectPortfolioAccountBalances,
  selectMarketData,
  (assetsById, accounts, marketData) => {
    return Object.entries(accounts).reduce(
      (acc, [accountId, balanceObj]) => {
        acc[accountId] = Object.entries(balanceObj).reduce(
          (acc, [caip19, cryptoBalance]) => {
            const precision = assetsById[caip19]?.precision
            const price = marketData[caip19]?.price
            const cryptoValue = fromBaseUnit(cryptoBalance, precision)
            const fiatbalance = bnOrZero(bn(cryptoValue).times(price)).toFixed(2)
            acc[caip19] = fiatbalance

            return acc
          },
          { ...balanceObj }
        )

        return acc
      },
      { ...accounts }
    )
  }
)

export const selectPortfolioTotalFiatBalance = createSelector(
  selectPortfolioFiatBalances,
  (portfolioFiatBalances): string =>
    Object.values(portfolioFiatBalances)
      .reduce((acc, assetFiatBalance) => acc.plus(bnOrZero(assetFiatBalance)), bn(0))
      .toFixed(2)
)

export const selectPortfolioFiatBalanceByAssetId = createSelector(
  selectPortfolioFiatBalances,
  selectAssetIdParam,
  (portfolioFiatBalances, assetId) => portfolioFiatBalances[assetId]
)

export const selectPortfolioFiatBalanceByFilter = createSelector(
  selectPortfolioFiatBalances,
  selectPortfolioFiatAccountBalances,
  selectAssetIdParamFromFilterOptional,
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
        '0'
      )
      return totalAccountBalances
    }
    return '0'
  }
)

export const selectPortfolioCryptoBalanceByAssetId = createSelector(
  selectPortfolioAssetBalances,
  selectAssetIdParam,
  (byId, assetId): string => byId[assetId]
)

export const selectPortfolioCryptoHumanBalanceByFilter = createSelector(
  selectAssets,
  selectPortfolioAccountBalances,
  selectPortfolioAssetBalances,
  selectAccountIdParamFromFilterOptional,
  selectAssetIdParamFromFilterOptional,
  (assets, accountBalances, assetBalances, accountId, assetId): string => {
    if (accountId && assetId) {
      return fromBaseUnit(
        bnOrZero(accountBalances?.[accountId]?.[assetId]),
        assets[assetId].precision ?? 0
      )
    }

    return fromBaseUnit(bnOrZero(assetBalances[assetId]), assets[assetId].precision ?? 0)
  }
)

export const selectPortfolioCryptoBalancesByAccountId = createSelector(
  selectPortfolioAccountBalances,
  selectPortfolioAssetBalances,
  (_state: ReduxState, accountId?: string) => accountId,
  (accountBalances, assetBalances, accountId): PortfolioBalancesById =>
    accountId ? accountBalances[accountId] : assetBalances
)

export const selectPortfolioCryptoBalanceByFilter = createSelector(
  selectPortfolioAccountBalances,
  selectPortfolioAssetBalances,
  selectAccountIdParamFromFilterOptional,
  selectAssetIdParamFromFilterOptional,
  (accountBalances, assetBalances, accountId, assetId): string => {
    if (accountId && assetId) {
      return accountBalances?.[accountId]?.[assetId] ?? '0'
    }
    return assetBalances[assetId] ?? '0'
  }
)

export const selectPortfolioCryptoHumanBalanceByAssetId = createSelector(
  selectAssets,
  selectPortfolioAssetBalances,
  selectAssetIdParam,
  (assets, balances, assetId): string =>
    fromBaseUnit(bnOrZero(balances[assetId]), assets[assetId]?.precision ?? 0)
)

export const selectPortfolioMixedHumanBalancesBySymbol = createSelector(
  selectAssets,
  selectMarketData,
  selectPortfolioAssetBalances,
  (assets, marketData, balances) =>
    Object.entries(balances).reduce<{ [k: CAIP19]: { crypto: string; fiat: string } }>(
      (acc, [assetId, balance]) => {
        const precision = assets[assetId]?.precision
        const price = marketData[assetId]?.price
        const cryptoValue = fromBaseUnit(balance, precision)
        const assetFiatBalance = bnOrZero(cryptoValue).times(bnOrZero(price)).toFixed(2)
        acc[assets[assetId].caip19] = { crypto: cryptoValue, fiat: assetFiatBalance }
        return acc
      },
      {}
    )
)

export const selectPortfolioAssets = createSelector(
  selectAssets,
  selectPortfolioAssetIds,
  (assetsById, portfolioAssetIds): { [k: CAIP19]: Asset } =>
    portfolioAssetIds.reduce<PortfolioAssets>((acc, cur) => {
      acc[cur] = assetsById[cur]
      return acc
    }, {})
)

export const selectPortfolioAccountIds = (state: ReduxState): AccountSpecifier[] =>
  state.portfolio.accounts.ids

// we only set ids when chain adapters responds, so if these are present, the portfolio has loaded
export const selectPortfolioLoading = createSelector(
  selectPortfolioAccountIds,
  (ids): boolean => !Boolean(ids.length)
)

export const selectPortfolioAssetBalancesSortedFiat = createSelector(
  selectPortfolioFiatBalances,
  (portfolioFiatBalances): { [k: CAIP19]: string } =>
    Object.entries(portfolioFiatBalances)
      .sort(([_, a], [__, b]) => (bnOrZero(a).gte(bnOrZero(b)) ? -1 : 1))
      .reduce<PortfolioAssetBalances['byId']>((acc, [assetId, assetFiatBalance]) => {
        acc[assetId] = assetFiatBalance
        return acc
      }, {})
)

export const selectPortfolioAssetAccountBalancesSortedFiat = createSelector(
  selectPortfolioFiatAccountBalances,
  (portfolioFiatAccountBalances): { [k: AccountSpecifier]: { [k: CAIP19]: string } } => {
    return Object.entries(portfolioFiatAccountBalances).reduce<{
      [k: AccountSpecifier]: { [k: CAIP19]: string }
    }>((acc, [accountId, assetBalanceObj]) => {
      const sortedAssetsByFiatBalances = Object.entries(assetBalanceObj)
        .sort(([_, a], [__, b]) => (bnOrZero(a).gte(bnOrZero(b)) ? -1 : 1))
        .reduce<{ [k: CAIP19]: string }>((acc, [assetId, assetFiatBalance]) => {
          acc[assetId] = assetFiatBalance
          return acc
        }, {})

      acc[accountId] = sortedAssetsByFiatBalances
      return acc
    }, {})
  }
)

export const selectPortfolioAssetIdsSortedFiat = createSelector(
  selectPortfolioAssetBalancesSortedFiat,
  (sortedBalances): CAIP19[] => Object.keys(sortedBalances)
)

export const selectPortfolioAllocationPercent = createSelector(
  selectPortfolioTotalFiatBalance,
  selectPortfolioFiatBalances,
  (totalBalance, fiatBalances): { [k: CAIP19]: number } =>
    Object.entries(fiatBalances).reduce<{ [k: CAIP19]: number }>((acc, [assetId, fiatBalance]) => {
      acc[assetId] = bnOrZero(fiatBalance).div(bnOrZero(totalBalance)).times(100).toNumber()
      return acc
    }, {})
)

export const selectPortfolioTotalFiatBalanceByAccount = createSelector(
  selectPortfolioFiatAccountBalances,
  accountBalances => {
    return Object.entries(accountBalances).reduce<{ [k: AccountSpecifier]: string }>(
      (acc, [accountId, balanceObj]) => {
        const totalAccountFiatBalance = Object.values(balanceObj).reduce(
          (totalBalance, currentBalance) => {
            return bnOrZero(bn(totalBalance).plus(bn(currentBalance))).toFixed(2)
          },
          '0'
        )

        acc[accountId] = totalAccountFiatBalance
        return acc
      },
      {}
    )
  }
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
        bn(assetAccountFiatBalance[assetId]).div(totalAssetFiatBalance).times(100)
      ).toNumber()

      acc[currentAccountId] = allocation
      return acc
    }, {})

    return balanceAllocationById[accountId]
  }
)

export const selectPortfolioAccountIdsSortedFiat = createSelector(
  selectPortfolioTotalFiatBalanceByAccount,
  totalAccountBalances => {
    return Object.entries(totalAccountBalances)
      .sort(([_, a], [__, b]) => (bnOrZero(a).gte(bnOrZero(b)) ? -1 : 1))
      .map(([acctId, _]) => acctId)
  }
)

export const selectPortfolioIsEmpty = createSelector(
  selectPortfolioAssetIds,
  (assetIds): boolean => !assetIds.length
)

export const selectPortfolioAccounts = (state: ReduxState) => state.portfolio.accounts.byId

export const selectPortfolioAssetAccounts = createSelector(
  selectPortfolioAccounts,
  (_state: ReduxState, assetId: CAIP19) => assetId,
  (portfolioAccounts, assetId): AccountSpecifier[] =>
    Object.keys(portfolioAccounts).filter(accountSpecifier =>
      portfolioAccounts[accountSpecifier].find(accountAssetId => accountAssetId === assetId)
    )
)

export const selectPortfolioAccountById = createSelector(
  selectPortfolioAccounts,
  (_state: ReduxState, accountId: AccountSpecifier) => accountId,
  (portfolioAccounts, accountId) => portfolioAccounts[accountId]
)

export const selectPortfolioAssetIdsByAccountId = createSelector(
  selectPortfolioAccountBalances,
  selectAccountIdParam,
  (accounts, accountId) => Object.keys(accounts[accountId])
)

// @TODO: remove this assets check once we filter the portfolio on the way in
export const selectPortfolioAssetIdsByAccountIdExcludeFeeAsset = createSelector(
  selectPortfolioAssetAccountBalancesSortedFiat,
  selectAccountIdParam,
  selectAssets,
  (accountAssets, accountId, assets) => {
    const assetsByAccountIds = accountAssets?.[accountId] ?? {}
    return Object.keys(assetsByAccountIds).filter(
      assetId => !FEE_ASSET_IDS.includes(assetId) && assets[assetId]
    )
  }
)

export const selectAccountIdByAddress = createSelector(
  selectAccountIds,
  selectAccountAddressParam,
  (portfolioAccounts: { [k: AccountSpecifier]: CAIP10[] }, caip10): string => {
    let accountSpecifier = ''
    for (const accountId in portfolioAccounts) {
      const isAccountSpecifier = !!portfolioAccounts[accountId].find(
        acctCaip10 => toLower(acctCaip10) === toLower(caip10)
      )
      if (isAccountSpecifier) {
        accountSpecifier = accountId
        break
      }
    }
    return accountSpecifier
  }
)

export const selectAccountIdsByAssetId = createSelector(
  selectPortfolioAccounts,
  selectAssetIdParam,
  findAccountsByAssetId
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
    balanceThreshold
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
        if (fiatAmount.isLessThan(bnOrZero(balanceThreshold))) return acc
        const allocation = fiatAmount.div(bnOrZero(totalPortfolioFiatBalance)).times(100).toNumber()
        const priceChange = marketData[assetId]?.changePercent24Hr
        const data = {
          assetId,
          name,
          icon,
          symbol,
          // second parameter is for rounding down instead of up
          fiatAmount: fiatAmount.toFixed(2, 1),
          cryptoAmount,
          allocation,
          price,
          priceChange
        }
        acc.push(data)
        return acc
      },
      []
    )
    return assetRows
  }
)
