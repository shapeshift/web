import type { Asset } from '@shapeshiftoss/asset-service'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import orderBy from 'lodash/orderBy'
import pickBy from 'lodash/pickBy'
import createCachedSelector from 're-reselect'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { isSome } from 'lib/utils'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import { selectAccountIdParamFromFilter, selectAssetIdParamFromFilter } from 'state/selectors'

import { selectAssets } from './assetsSlice/selectors'
import { selectMarketDataSortedByMarketCap } from './marketDataSlice/selectors'
import type { PortfolioAccountBalancesById } from './portfolioSlice/portfolioSliceCommon'
import { selectBalanceThreshold } from './preferencesSlice/selectors'

export const selectWalletId = (state: ReduxState) => state.portfolio.walletId
export const selectWalletName = (state: ReduxState) => state.portfolio.walletName

export const selectWalletAccountIds = createDeepEqualOutputSelector(
  selectWalletId,
  (state: ReduxState) => state.portfolio.wallet.byId,
  (walletId, walletById): AccountId[] => (walletId && walletById[walletId]) ?? [],
)

export const selectPortfolioAccountBalancesBaseUnit = createDeepEqualOutputSelector(
  selectWalletAccountIds,
  (state: ReduxState): PortfolioAccountBalancesById => state.portfolio.accountBalances.byId,
  (walletAccountIds, accountBalancesById) =>
    pickBy(accountBalancesById, (_balances, accountId: AccountId) =>
      walletAccountIds.includes(accountId),
    ),
)

export const selectPortfolioAssetBalancesBaseUnit = createDeepEqualOutputSelector(
  selectPortfolioAccountBalancesBaseUnit,
  (accountBalancesById): Record<AssetId, string> =>
    Object.values(accountBalancesById).reduce<Record<AssetId, string>>((acc, byAccountId) => {
      Object.entries(byAccountId).forEach(
        ([assetId, balance]) =>
          (acc[assetId] = bnOrZero(acc[assetId]).plus(bnOrZero(balance)).toFixed()),
      )
      return acc
    }, {}),
)

export const selectPortfolioCryptoBalanceBaseUnitByFilter = createCachedSelector(
  selectPortfolioAccountBalancesBaseUnit,
  selectPortfolioAssetBalancesBaseUnit,
  selectAccountIdParamFromFilter,
  selectAssetIdParamFromFilter,
  (accountBalances, assetBalances, accountId, assetId): string => {
    if (accountId && assetId) return accountBalances?.[accountId]?.[assetId] ?? '0'
    return assetId ? assetBalances[assetId] : '0'
  },
)((_s: ReduxState, filter) => `${filter?.accountId}-${filter?.assetId}` ?? 'accountId-assetId')

export const selectPortfolioCryptoPrecisionBalanceByFilter = createCachedSelector(
  selectAssets,
  selectPortfolioAccountBalancesBaseUnit,
  selectPortfolioAssetBalancesBaseUnit,
  selectAccountIdParamFromFilter,
  selectAssetIdParamFromFilter,
  (assets, accountBalances, assetBalances, accountId, assetId): string | undefined => {
    if (!assetId) return
    const precision = assets?.[assetId]?.precision ?? 0
    if (accountId) return fromBaseUnit(bnOrZero(accountBalances?.[accountId]?.[assetId]), precision)
    return fromBaseUnit(bnOrZero(assetBalances[assetId]), precision)
  },
)((_s: ReduxState, filter) => `${filter?.accountId}-${filter?.assetId}` ?? 'accountId-assetId')

export const selectPortfolioFiatBalances = createDeepEqualOutputSelector(
  selectAssets,
  selectMarketDataSortedByMarketCap,
  selectPortfolioAssetBalancesBaseUnit,
  selectBalanceThreshold,
  (assetsById, marketData, balances, balanceThreshold) =>
    Object.entries(balances).reduce<Record<AssetId, string>>((acc, [assetId, baseUnitBalance]) => {
      const asset = assetsById[assetId]
      if (!asset) return acc
      const precision = asset.precision
      if (!precision) return acc
      const price = marketData[assetId]?.price
      const cryptoValue = fromBaseUnit(baseUnitBalance, precision)
      const assetFiatBalance = bnOrZero(cryptoValue).times(bnOrZero(price))
      if (assetFiatBalance.lt(bnOrZero(balanceThreshold))) return acc
      acc[assetId] = assetFiatBalance.toFixed(2)
      return acc
    }, {}),
)

export const selectPortfolioFiatBalancesByAccountId = createDeepEqualOutputSelector(
  selectAssets,
  selectPortfolioAccountBalancesBaseUnit,
  selectMarketDataSortedByMarketCap,
  (assetsById, accounts, marketData) => {
    return Object.entries(accounts).reduce(
      (acc, [accountId, balanceObj]) => {
        acc[accountId] = Object.entries(balanceObj).reduce(
          (acc, [assetId, cryptoBalance]) => {
            const asset = assetsById[assetId]
            if (!asset) return acc
            const precision = asset.precision
            const price = marketData[assetId]?.price ?? 0
            const cryptoValue = fromBaseUnit(bnOrZero(cryptoBalance), precision)
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

export const selectSortedAssets = createDeepEqualOutputSelector(
  selectAssets,
  selectPortfolioFiatBalances,
  selectMarketDataSortedByMarketCap,
  (assets, portfolioFiatBalances, cryptoMarketData) => {
    const getAssetFiatBalance = (asset: Asset) =>
      bnOrZero(portfolioFiatBalances[asset.assetId]).toNumber()
    const getAssetMarketCap = (asset: Asset) =>
      bnOrZero(cryptoMarketData[asset.assetId]?.marketCap).toNumber()
    const getAssetName = (asset: Asset) => asset.name

    return orderBy(
      Object.values(assets).filter(isSome),
      [getAssetFiatBalance, getAssetMarketCap, getAssetName],
      ['desc', 'desc', 'asc'],
    )
  },
)

export const selectSortedAssetIds = createDeepEqualOutputSelector(
  selectSortedAssets,
  sortedAssets => sortedAssets.map(asset => asset.assetId),
)
