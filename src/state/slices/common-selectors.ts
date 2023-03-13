import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import pickBy from 'lodash/pickBy'
import createCachedSelector from 're-reselect'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
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

export const selectPortfolioAccountBalances = createDeepEqualOutputSelector(
  selectWalletAccountIds,
  (state: ReduxState): PortfolioAccountBalancesById => state.portfolio.accountBalances.byId,
  (walletAccountIds, accountBalancesById) =>
    pickBy(accountBalancesById, (_balances, accountId: AccountId) =>
      walletAccountIds.includes(accountId),
    ),
)

export const selectPortfolioAssetBalances = createDeepEqualOutputSelector(
  selectPortfolioAccountBalances,
  (accountBalancesById): Record<AssetId, string> =>
    Object.values(accountBalancesById).reduce<Record<AssetId, string>>((acc, byAccountId) => {
      Object.entries(byAccountId).forEach(
        ([assetId, balance]) =>
          (acc[assetId] = bnOrZero(acc[assetId]).plus(bnOrZero(balance)).toFixed()),
      )
      return acc
    }, {}),
)

export const selectPortfolioCryptoBalanceByFilter = createCachedSelector(
  selectPortfolioAccountBalances,
  selectPortfolioAssetBalances,
  selectAccountIdParamFromFilter,
  selectAssetIdParamFromFilter,
  (accountBalances, assetBalances, accountId, assetId): string => {
    if (accountId && assetId) return accountBalances?.[accountId]?.[assetId]
    return assetId ? assetBalances[assetId] : '0'
  },
)((_s: ReduxState, filter) => `${filter?.accountId}-${filter?.assetId}` ?? 'accountId-assetId')

export const selectPortfolioCryptoHumanBalanceByFilter = createCachedSelector(
  selectAssets,
  selectPortfolioAccountBalances,
  selectPortfolioAssetBalances,
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
  selectPortfolioAssetBalances,
  selectBalanceThreshold,
  (assetsById, marketData, balances, balanceThreshold) =>
    Object.entries(balances).reduce<Record<AssetId, string>>((acc, [assetId, baseUnitBalance]) => {
      const asset = assetsById[assetId]
      if (!asset) return acc
      const precision = asset.precision
      const price = marketData[assetId]?.price
      const cryptoValue = fromBaseUnit(baseUnitBalance, precision)
      const assetFiatBalance = bnOrZero(cryptoValue).times(bnOrZero(price))
      if (assetFiatBalance.lt(bnOrZero(balanceThreshold))) return acc
      acc[assetId] = assetFiatBalance.toFixed(2)
      return acc
    }, {}),
)
