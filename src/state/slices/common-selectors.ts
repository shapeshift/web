import type { ChainId } from '@shapeshiftoss/caip'
import { type AccountId, type AssetId, fromAccountId } from '@shapeshiftoss/caip'
import type { Asset, PartialRecord } from '@shapeshiftoss/types'
import { orderBy } from 'lodash'
import pickBy from 'lodash/pickBy'
import createCachedSelector from 're-reselect'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { isSome } from 'lib/utils'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import { selectAccountIdParamFromFilter, selectAssetIdParamFromFilter } from 'state/selectors'

import { selectFungibleAssets } from './assetsSlice/selectors'
import {
  selectCryptoMarketData,
  selectSelectedCurrencyMarketDataSortedByMarketCap,
} from './marketDataSlice/selectors'
import type { PortfolioAccountBalancesById } from './portfolioSlice/portfolioSliceCommon'
import { selectBalanceThreshold } from './preferencesSlice/selectors'

export const selectWalletId = (state: ReduxState) => state.portfolio.connectedWallet?.id
export const selectWalletName = (state: ReduxState) => state.portfolio.connectedWallet?.name
export const selectIsWalletConnected = (state: ReduxState) =>
  state.portfolio.connectedWallet !== undefined
export const selectWalletSupportedChainIds = (state: ReduxState) =>
  state.portfolio.connectedWallet?.supportedChainIds ?? []

export const selectWalletAccountIds = createDeepEqualOutputSelector(
  selectWalletId,
  (state: ReduxState) => state.portfolio.wallet.byId,
  (walletId, walletById): AccountId[] => (walletId && walletById[walletId]) ?? [],
)

export const selectWalletChainIds = createDeepEqualOutputSelector(
  selectWalletAccountIds,
  accountIds => {
    const chainIds = accountIds.reduce<ChainId[]>((acc, accountId) => {
      const { chainId } = fromAccountId(accountId)
      if (!acc.includes(chainId)) acc.push(chainId)
      return acc
    }, [])
    return chainIds
  },
)

export const selectPortfolioAccountBalancesBaseUnit = createDeepEqualOutputSelector(
  selectWalletAccountIds,
  (state: ReduxState): PortfolioAccountBalancesById => state.portfolio.accountBalances.byId,
  (walletAccountIds, accountBalancesById) =>
    pickBy(accountBalancesById, (_balances, accountId: AccountId) =>
      walletAccountIds.includes(accountId),
    ),
)

/**
 * Selects the collection of assets in the portfolio, including those unsupported by our platform.
 * Used to feed downstream selectors which require asset metadata for displaying the portfolio where
 * unsupported assets would be missing this metadata otherwise.
 *
 * For performance reasons this does not return the superset of `fungibleAssetsById` and
 * `unsupportedFungiblePortfolioAssetsById` but instead only returns the assets actually held.
 */
export const selectPortfolioFungibleAssetsById = createDeepEqualOutputSelector(
  selectFungibleAssets,
  (state: ReduxState) => state.portfolio.unsupportedFungiblePortfolioAssets.byId,
  (state: ReduxState): PortfolioAccountBalancesById => state.portfolio.accountBalances.byId,
  (fungibleAssetsById, unsupportedFungiblePortfolioAssetsById, accountBalancesById) => {
    return Object.values(accountBalancesById).reduce<PartialRecord<AssetId, Asset>>(
      (acc, byAssetId) => {
        Object.keys(byAssetId).forEach(assetId => {
          acc[assetId] =
            fungibleAssetsById[assetId] ?? unsupportedFungiblePortfolioAssetsById[assetId]
        })
        return acc
      },
      {},
    )
  },
)

export const selectPortfolioAssetBalancesBaseUnit = createDeepEqualOutputSelector(
  selectPortfolioAccountBalancesBaseUnit,
  (accountBalancesById): Record<AssetId, string> =>
    Object.values(accountBalancesById).reduce<Record<AssetId, string>>((acc, byAssetId) => {
      Object.entries(byAssetId).forEach(
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
  selectPortfolioFungibleAssetsById,
  selectPortfolioAccountBalancesBaseUnit,
  selectPortfolioAssetBalancesBaseUnit,
  selectAccountIdParamFromFilter,
  selectAssetIdParamFromFilter,
  (assets, accountBalances, assetBalances, accountId, assetId): string => {
    if (!assetId) return '0'
    const precision = assets[assetId]?.precision
    // to avoid megabillion phantom balances in mixpanel, return 0 rather than base unit value
    // if we don't have a precision for the asset
    if (precision === undefined) return '0'
    if (accountId) return fromBaseUnit(bnOrZero(accountBalances?.[accountId]?.[assetId]), precision)
    return fromBaseUnit(bnOrZero(assetBalances[assetId]), precision)
  },
)((_s: ReduxState, filter) => `${filter?.accountId}-${filter?.assetId}` ?? 'accountId-assetId')

export const selectPortfolioUserCurrencyBalances = createDeepEqualOutputSelector(
  selectPortfolioFungibleAssetsById,
  selectSelectedCurrencyMarketDataSortedByMarketCap,
  selectPortfolioAssetBalancesBaseUnit,
  selectBalanceThreshold,
  (assetsById, marketData, balances, balanceThreshold) =>
    Object.entries(balances).reduce<Record<AssetId, string>>((acc, [assetId, baseUnitBalance]) => {
      const asset = assetsById[assetId]
      if (!asset) return acc
      const precision = asset.precision
      if (precision === undefined) return acc
      const price = marketData[assetId]?.price
      const cryptoValue = fromBaseUnit(baseUnitBalance, precision)
      const assetUserCurrencyBalance = bnOrZero(cryptoValue).times(bnOrZero(price))
      if (assetUserCurrencyBalance.lt(bnOrZero(balanceThreshold))) return acc
      acc[assetId] = assetUserCurrencyBalance.toFixed(2)
      return acc
    }, {}),
)

export const selectPortfolioUserCurrencyBalancesByAccountId = createDeepEqualOutputSelector(
  selectPortfolioFungibleAssetsById,
  selectPortfolioAccountBalancesBaseUnit,
  selectSelectedCurrencyMarketDataSortedByMarketCap,
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
            const userCurrencyBalance = bnOrZero(bn(cryptoValue).times(price)).toFixed(2)
            acc[assetId] = userCurrencyBalance

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

export const selectAssetsSortedByMarketCapUserCurrencyBalanceAndName =
  createDeepEqualOutputSelector(
    selectFungibleAssets,
    selectPortfolioUserCurrencyBalances,
    selectCryptoMarketData,
    (assets, portfolioUserCurrencyBalances, cryptoMarketData) => {
      const getAssetUserCurrencyBalance = (asset: Asset) =>
        bnOrZero(portfolioUserCurrencyBalances[asset.assetId]).toNumber()

      // This looks weird but isn't - looks like we could use the sorted selectAssetsByMarketCap instead of selectAssets
      // but we actually can't - this would rug the triple-sorting
      const getAssetMarketCap = (asset: Asset) =>
        bnOrZero(cryptoMarketData[asset.assetId]?.marketCap).toNumber()
      const getAssetName = (asset: Asset) => asset.name

      return orderBy(
        Object.values(assets).filter(isSome),
        [getAssetUserCurrencyBalance, getAssetMarketCap, getAssetName],
        ['desc', 'desc', 'asc'],
      )
    },
  )
