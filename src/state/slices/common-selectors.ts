import type { ChainId } from '@shapeshiftoss/caip'
import { type AccountId, type AssetId, fromAccountId, isNft } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { Asset, PartialRecord } from '@shapeshiftoss/types'
import orderBy from 'lodash/orderBy'
import pickBy from 'lodash/pickBy'
import createCachedSelector from 're-reselect'
import { createSelector } from 'reselect'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { isSome } from 'lib/utils'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import { selectAccountIdParamFromFilter, selectAssetIdParamFromFilter } from 'state/selectors'

import { selectAssetById, selectAssets } from './assetsSlice/selectors'
import { getFeeAssetByChainId } from './assetsSlice/utils'
import {
  selectMarketDataByAssetIdUserCurrency,
  selectMarketDataUsd,
  selectMarketDataUserCurrency,
} from './marketDataSlice/selectors'
import type { PortfolioAccountBalancesById } from './portfolioSlice/portfolioSliceCommon'
import { selectBalanceThreshold } from './preferencesSlice/selectors'

export const selectWalletId = (state: ReduxState) => state.portfolio.connectedWallet?.id
export const selectWalletName = (state: ReduxState) => state.portfolio.connectedWallet?.name
export const selectIsWalletConnected = (state: ReduxState) =>
  state.portfolio.connectedWallet !== undefined
export const selectWalletSupportedChainIds = (state: ReduxState) =>
  state.portfolio.connectedWallet?.supportedChainIds ?? []
export const selectWalletEnabledAccountIds = createDeepEqualOutputSelector(
  selectWalletId,
  (state: ReduxState) => state.portfolio.enabledAccountIds,
  (walletId, enabledAccountIds) => {
    if (!walletId) return []
    return enabledAccountIds[walletId] ?? []
  },
)

export const selectWalletAccountIds = createDeepEqualOutputSelector(
  selectWalletId,
  (state: ReduxState) => state.portfolio.wallet.byId,
  selectWalletEnabledAccountIds,
  (walletId, walletById, enabledAccountIds): AccountId[] => {
    const walletAccountIds = (walletId && walletById[walletId]) ?? []
    return walletAccountIds.filter(accountId => (enabledAccountIds ?? []).includes(accountId))
  },
)

export const selectEvmAccountIds = createDeepEqualOutputSelector(
  selectWalletAccountIds,
  accountIds => accountIds.filter(accountId => isEvmChainId(fromAccountId(accountId).chainId)),
)

export const selectWalletConnectedChainIds = createDeepEqualOutputSelector(
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

export const selectPortfolioAssetBalancesBaseUnit = createDeepEqualOutputSelector(
  selectPortfolioAccountBalancesBaseUnit,
  (accountBalancesById): Record<AssetId, string> =>
    Object.values(accountBalancesById).reduce<Record<AssetId, string>>((acc, byAssetId) => {
      Object.entries(byAssetId).forEach(([assetId, balance]) => {
        const bnBalance = bnOrZero(balance)

        // don't include assets with zero crypto balance
        if (bnBalance.isZero()) {
          return
        }

        acc[assetId] = bnOrZero(acc[assetId]).plus(bnBalance).toFixed()
      })
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
)((_s: ReduxState, filter) => `${filter?.accountId ?? 'accountId'}-${filter?.assetId ?? 'assetId'}`)

export const selectPortfolioCryptoPrecisionBalanceByFilter = createCachedSelector(
  selectAssets,
  selectPortfolioAccountBalancesBaseUnit,
  selectPortfolioAssetBalancesBaseUnit,
  selectAccountIdParamFromFilter,
  selectAssetIdParamFromFilter,
  (assets, accountBalances, assetBalances, accountId, assetId): string => {
    if (!assetId) return '0'
    const precision = assets?.[assetId]?.precision
    // to avoid megabillion phantom balances in mixpanel, return 0 rather than base unit value
    // if we don't have a precision for the asset
    if (precision === undefined) return '0'
    if (accountId) return fromBaseUnit(bnOrZero(accountBalances?.[accountId]?.[assetId]), precision)
    return fromBaseUnit(bnOrZero(assetBalances[assetId]), precision)
  },
)((_s: ReduxState, filter) => `${filter?.accountId ?? 'accountId'}-${filter?.assetId ?? 'assetId'}`)

export const selectPortfolioUserCurrencyBalances = createDeepEqualOutputSelector(
  selectAssets,
  selectMarketDataUserCurrency,
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
  selectAssets,
  selectPortfolioAccountBalancesBaseUnit,
  selectMarketDataUserCurrency,
  (assetsById, accounts, marketData) => {
    return Object.entries(accounts).reduce<
      PartialRecord<AccountId, PartialRecord<AssetId, string>>
    >((acc, [accountId, balanceObj]) => {
      acc[accountId] = Object.entries(balanceObj).reduce<PartialRecord<AssetId, string>>(
        (balanceByAssetId, [assetId, cryptoBalance]) => {
          const asset = assetsById[assetId]
          if (!asset) return balanceByAssetId
          const precision = asset.precision
          const price = marketData[assetId]?.price ?? 0
          const cryptoValue = fromBaseUnit(bnOrZero(cryptoBalance), precision)
          const userCurrencyBalance = bnOrZero(bn(cryptoValue).times(price)).toFixed(2)
          balanceByAssetId[assetId] = userCurrencyBalance

          return balanceByAssetId
        },
        {},
      )

      return acc
    }, {})
  },
)

export const selectAssetsSortedByMarketCapUserCurrencyBalanceAndName =
  createDeepEqualOutputSelector(
    selectAssets,
    selectPortfolioUserCurrencyBalances,
    selectMarketDataUsd,
    (assets, portfolioUserCurrencyBalances, marketDataUsd) => {
      const getAssetUserCurrencyBalance = (asset: Asset) =>
        bnOrZero(portfolioUserCurrencyBalances[asset.assetId]).toNumber()

      // This looks weird but isn't - looks like we could use the sorted selectAssetsByMarketCap instead of selectAssets
      // but we actually can't - this would rug the triple-sorting
      const getAssetMarketCap = (asset: Asset) =>
        bnOrZero(marketDataUsd[asset.assetId]?.marketCap).toNumber()
      const getAssetName = (asset: Asset) => asset.name

      return orderBy(
        Object.values(assets).filter(isSome),
        [getAssetUserCurrencyBalance, getAssetMarketCap, getAssetName],
        ['desc', 'desc', 'asc'],
      )
    },
  )

export const selectAssetsSortedByName = createDeepEqualOutputSelector(selectAssets, assets => {
  const getAssetName = (asset: Asset) => asset.name
  return orderBy(Object.values(assets).filter(isSome), [getAssetName], ['asc'])
})

export const selectPortfolioFungibleAssetsSortedByBalance = createDeepEqualOutputSelector(
  selectPortfolioUserCurrencyBalances,
  selectAssets,
  (portfolioUserCurrencyBalances, assets) => {
    const getAssetBalance = ([_assetId, balance]: [AssetId, string]) => bnOrZero(balance).toNumber()

    return orderBy<[AssetId, string][]>(
      Object.entries(portfolioUserCurrencyBalances),
      [getAssetBalance],
      ['desc'],
    )
      .map(value => {
        const assetId = (value as [AssetId, string])[0]
        return assets[assetId]
      })
      .filter(isSome)
      .filter(asset => !isNft(asset.assetId))
  },
)

export const selectHighestMarketCapFeeAsset = createSelector(
  selectWalletConnectedChainIds,
  selectMarketDataUsd,
  selectAssets,
  (walletChainIds, marketDataUsd, assetsById): Asset | undefined => {
    const feeAssets = walletChainIds.map(chainId => getFeeAssetByChainId(assetsById, chainId))
    const getAssetMarketCap = (asset: Asset) =>
      bnOrZero(marketDataUsd[asset.assetId]?.marketCap).toNumber()
    const sortedFeeAssets = orderBy(
      Object.values(feeAssets).filter(isSome),
      [getAssetMarketCap],
      ['desc'],
    )

    return sortedFeeAssets[0]
  },
)

export const selectIsCustomAsset = createSelector(
  selectAssetById,
  (_state: ReduxState, assetId: AssetId) => assetId,
  (asset, _assetId): boolean => {
    if (!asset) return false
    return !!asset.isCustomAsset
  },
)

// This is a specific case we want to check for, where we have a custom asset but no market data
export const selectIsCustomAssetWithoutMarketData = createSelector(
  selectMarketDataByAssetIdUserCurrency,
  selectIsCustomAsset,
  (marketData, isCustomAsset): boolean => {
    return !marketData.price && isCustomAsset
  },
)
