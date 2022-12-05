import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import pickBy from 'lodash/pickBy'
import createCachedSelector from 're-reselect'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import { selectAccountIdParamFromFilter, selectAssetIdParamFromFilter } from 'state/selectors'

import { selectAssets } from './assetsSlice/selectors'
import type { PortfolioAccountBalancesById } from './portfolioSlice/portfolioSliceCommon'

export const selectWalletId = (state: ReduxState) => state.portfolio.walletId

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
