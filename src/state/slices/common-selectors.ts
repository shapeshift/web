import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAccountId, fromAssetId, isNft } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { Asset, PartialRecord } from '@shapeshiftoss/types'
import orderBy from 'lodash/orderBy'
import pickBy from 'lodash/pickBy'
import { matchSorter } from 'match-sorter'
import createCachedSelector from 're-reselect'
import { createSelector } from 'reselect'

import {
  selectAssets,
  selectPrimaryAssets,
  selectPrimaryAssetsSortedByMarketCap,
} from './assetsSlice/selectors'
import { getFeeAssetByChainId } from './assetsSlice/utils'
import { marketData } from './marketDataSlice/marketDataSlice'
import {
  selectMarketDataByAssetIdUserCurrency,
  selectMarketDataUserCurrency,
} from './marketDataSlice/selectors'
import { portfolio } from './portfolioSlice/portfolioSlice'
import { preferences } from './preferencesSlice/preferencesSlice'

import { bn, bnOrZero } from '@/lib/bignumber/bignumber'
import { fromBaseUnit } from '@/lib/math'
import { isSome } from '@/lib/utils'
import type { ReduxState } from '@/state/reducer'
import { createDeepEqualOutputSelector } from '@/state/selector-utils'
import {
  selectAccountIdParamFromFilter,
  selectAssetIdParamFromFilter,
  selectLimitParamFromFilter,
  selectSearchQueryFromFilter,
} from '@/state/selectors'
import type { RelatedAssetIdsById } from '@/state/slices/assetsSlice/types'

export const selectWalletId = portfolio.selectors.selectWalletId
export const selectWalletName = portfolio.selectors.selectWalletName

export const selectWalletEnabledAccountIds = createDeepEqualOutputSelector(
  selectWalletId,
  portfolio.selectors.selectEnabledAccountIds,
  (walletId, enabledAccountIds) => {
    if (!walletId) return []
    return enabledAccountIds[walletId] ?? []
  },
)

export const selectEnabledWalletAccountIds = createDeepEqualOutputSelector(
  selectWalletId,
  portfolio.selectors.selectAccountIdsByWalletId,
  selectWalletEnabledAccountIds,
  (walletId, walletById, enabledAccountIds): AccountId[] => {
    const walletAccountIds = (walletId && walletById[walletId]) ?? []
    return walletAccountIds.filter(accountId => (enabledAccountIds ?? []).includes(accountId))
  },
)

export const selectWalletAccountIds = createDeepEqualOutputSelector(
  selectWalletId,
  portfolio.selectors.selectAccountIdsByWalletId,
  (walletId, accountIdsByWalletId): AccountId[] => {
    const walletAccountIds = accountIdsByWalletId?.[walletId ?? ''] ?? []
    return walletAccountIds
  },
)

export const selectEvmAccountIds = createDeepEqualOutputSelector(
  selectEnabledWalletAccountIds,
  accountIds => accountIds.filter(accountId => isEvmChainId(fromAccountId(accountId).chainId)),
)

export const selectWalletConnectedChainIds = createDeepEqualOutputSelector(
  selectEnabledWalletAccountIds,
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
  selectEnabledWalletAccountIds,
  portfolio.selectors.selectAccountBalancesById,
  (walletAccountIds, accountBalancesById) =>
    pickBy(accountBalancesById, (_balances, accountId: AccountId) =>
      walletAccountIds.includes(accountId),
    ),
)

export const selectPortfolioAssetBalancesBaseUnitIncludingZeroBalances =
  createDeepEqualOutputSelector(
    selectPortfolioAccountBalancesBaseUnit,
    (accountBalancesById): Record<AssetId, string> =>
      Object.values(accountBalancesById).reduce<Record<AssetId, string>>((acc, byAssetId) => {
        Object.entries(byAssetId).forEach(([assetId, balance]) => {
          const bnBalance = bnOrZero(balance)

          acc[assetId] = bnOrZero(acc[assetId]).plus(bnBalance).toFixed()
        })
        return acc
      }, {}),
  )

export const selectPortfolioAssetBalancesBaseUnit = createDeepEqualOutputSelector(
  selectPortfolioAssetBalancesBaseUnitIncludingZeroBalances,
  (assetBalancesById): Record<AssetId, string> => {
    return pickBy(assetBalancesById, balance => !bnOrZero(balance).isZero())
  },
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
  preferences.selectors.selectBalanceThreshold,
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

export const selectRelatedAssetIdsByAssetIdInclusive = createDeepEqualOutputSelector(
  selectAssets,
  byId => {
    return Object.values(byId).reduce<RelatedAssetIdsById>((acc, asset) => {
      if (!asset) return acc
      if (!asset.relatedAssetKey) {
        acc[asset.assetId] = [...(acc[asset.assetId] ?? []), asset.assetId]
        return acc
      }
      if (asset.relatedAssetKey)
        acc[asset.relatedAssetKey] = [...(acc[asset.relatedAssetKey] ?? []), asset.assetId]
      return acc
    }, {})
  },
)

export const selectPortfolioPrimaryAssetUserCurrencyBalances = createDeepEqualOutputSelector(
  selectAssets,
  selectMarketDataUserCurrency,
  selectPortfolioAssetBalancesBaseUnit,
  selectRelatedAssetIdsByAssetIdInclusive,
  preferences.selectors.selectBalanceThreshold,
  (assetsById, marketData, balances, relatedAssetIdsById, balanceThreshold) =>
    Object.entries(balances).reduce<Record<AssetId, string>>((acc, [assetId]) => {
      const asset = assetsById[assetId]
      const primaryAsset = asset?.isPrimary ? asset : assetsById[asset?.relatedAssetKey ?? '']
      const primaryAssetId = primaryAsset?.assetId

      if (!primaryAssetId) return acc
      if (!primaryAsset.isPrimary) return acc
      if (acc[primaryAssetId]) return acc
      const precision = primaryAsset.precision
      if (precision === undefined) return acc
      const price = marketData[primaryAssetId]?.price

      const totalCryptoBalance = relatedAssetIdsById[primaryAssetId]?.reduce(
        (acc, relatedAssetId) => {
          return acc.plus(
            fromBaseUnit(balances[relatedAssetId], assetsById[relatedAssetId]?.precision ?? 0),
          )
        },
        bnOrZero(0),
      )

      const assetUserCurrencyBalance = bnOrZero(totalCryptoBalance).times(bnOrZero(price))
      if (
        assetUserCurrencyBalance.lt(bnOrZero(balanceThreshold)) &&
        totalCryptoBalance.lte(balanceThreshold)
      )
        return acc
      acc[primaryAssetId] = assetUserCurrencyBalance.toFixed(2)
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
    marketData.selectors.selectMarketDataUsd,
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

export const selectAssetsSortedByMarketCapUserCurrencyBalanceCryptoPrecisionAndName =
  createDeepEqualOutputSelector(
    selectAssets,
    selectPortfolioAssetBalancesBaseUnit,
    selectPortfolioUserCurrencyBalances,
    marketData.selectors.selectMarketDataUsd,
    (assets, portfolioBalancesCryptoBaseUnit, portfolioBalancesUserCurrency, marketDataUsd) => {
      const getAssetBalanceCryptoPrecision = (asset: Asset) =>
        fromBaseUnit(bnOrZero(portfolioBalancesCryptoBaseUnit[asset.assetId]), asset.precision)

      const getAssetUserCurrencyBalance = (asset: Asset) =>
        bnOrZero(portfolioBalancesUserCurrency[asset.assetId]).toNumber()

      // This looks weird but isn't - looks like we could use the sorted selectAssetsByMarketCap instead of selectAssets
      // but we actually can't - this would rug the quadruple-sorting
      const getAssetMarketCap = (asset: Asset) =>
        bnOrZero(marketDataUsd[asset.assetId]?.marketCap).toNumber()
      const getAssetName = (asset: Asset) => asset.name

      return orderBy(
        Object.values(assets).filter(isSome),
        [
          getAssetUserCurrencyBalance,
          getAssetMarketCap,
          getAssetBalanceCryptoPrecision,
          getAssetName,
        ],
        ['desc', 'desc', 'desc', 'asc'],
      )
    },
  )

export const selectPrimaryAssetsSortedByMarketCapUserCurrencyBalanceCryptoPrecisionAndName =
  createDeepEqualOutputSelector(
    selectPrimaryAssets,
    selectPortfolioAssetBalancesBaseUnit,
    selectPortfolioUserCurrencyBalances,
    marketData.selectors.selectMarketDataUsd,
    selectRelatedAssetIdsByAssetIdInclusive,
    (
      assets,
      portfolioBalancesCryptoBaseUnit,
      portfolioBalancesUserCurrency,
      marketDataUsd,
      relatedAssetIdsById,
    ) => {
      const getAssetBalanceCryptoPrecision = (asset: Asset) => {
        if (asset.isChainSpecific)
          return fromBaseUnit(
            bnOrZero(portfolioBalancesCryptoBaseUnit[asset.assetId]),
            asset.precision,
          )

        const primaryAssetTotalCryptoBalance = relatedAssetIdsById[asset.assetId]?.reduce(
          (acc, relatedAssetId) => {
            return acc.plus(bnOrZero(portfolioBalancesCryptoBaseUnit[relatedAssetId]))
          },
          bnOrZero(0),
        )

        return primaryAssetTotalCryptoBalance.toNumber()
      }

      const getAssetUserCurrencyBalance = (asset: Asset) => {
        if (asset.isChainSpecific)
          return bnOrZero(portfolioBalancesUserCurrency[asset.assetId]).toNumber()

        const primaryAssetTotalUserCurrencyBalance = relatedAssetIdsById[asset.assetId]?.reduce(
          (acc, relatedAssetId) => {
            return acc.plus(bnOrZero(portfolioBalancesUserCurrency[relatedAssetId]))
          },
          bnOrZero(0),
        )

        return primaryAssetTotalUserCurrencyBalance.toNumber()
      }

      // This looks weird but isn't - looks like we could use the sorted selectAssetsByMarketCap instead of selectAssets
      // but we actually can't - this would rug the quadruple-sorting
      const getAssetMarketCap = (asset: Asset) =>
        bnOrZero(marketDataUsd[asset.assetId]?.marketCap).toNumber()
      const getAssetName = (asset: Asset) => asset.name

      return orderBy(
        Object.values(assets).filter(isSome),
        [
          getAssetUserCurrencyBalance,
          getAssetMarketCap,
          getAssetBalanceCryptoPrecision,
          getAssetName,
        ],
        ['desc', 'desc', 'desc', 'asc'],
      )
    },
  )

export const selectAssetsSortedByName = createDeepEqualOutputSelector(selectAssets, assets => {
  const getAssetName = (asset: Asset) => asset.name
  return orderBy(Object.values(assets).filter(isSome), [getAssetName], ['asc'])
})

export const selectPortfolioFungiblePrimaryAssetsSortedByBalance = createDeepEqualOutputSelector(
  selectPortfolioPrimaryAssetUserCurrencyBalances,
  selectPrimaryAssets,
  selectRelatedAssetIdsByAssetIdInclusive,
  (portfolioUserCurrencyBalances, assets, relatedAssetIdsById) => {
    const getAssetBalance = ([_assetId, balance]: [AssetId, string]) => {
      const asset = assets[_assetId]
      if (!asset) return 0
      if (asset.isChainSpecific) return bnOrZero(balance).toNumber()

      const primaryAssetTotalBalance = relatedAssetIdsById[asset.assetId]?.reduce(
        (acc, relatedAssetId) => {
          return acc.plus(bnOrZero(portfolioUserCurrencyBalances[relatedAssetId]))
        },
        bnOrZero(0),
      )

      return primaryAssetTotalBalance.toNumber()
    }

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
  marketData.selectors.selectMarketDataUsd,
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

export const selectIsAssetWithoutMarketData = createSelector(
  selectMarketDataByAssetIdUserCurrency,
  (marketData): boolean => {
    return !marketData || marketData.price === '0'
  },
)

export const selectAssetsBySearchQuery = createCachedSelector(
  selectPrimaryAssetsSortedByMarketCap,
  marketData.selectors.selectMarketDataUsd,
  selectSearchQueryFromFilter,
  selectLimitParamFromFilter,
  (sortedAssets, marketDataUsd, searchQuery, limit): Asset[] => {
    if (!searchQuery) return sortedAssets.slice(0, limit)

    // Filters by low market-cap to avoid spew
    const filteredAssets = sortedAssets.filter(asset => {
      const marketCap = marketDataUsd[asset.assetId]?.marketCap
      return bnOrZero(marketCap).isZero() || bnOrZero(marketCap).gte(1000)
    })
    const matchedAssets = matchSorter(filteredAssets, searchQuery, {
      keys: [
        { key: 'name', threshold: matchSorter.rankings.MATCHES },
        { key: 'symbol', threshold: matchSorter.rankings.WORD_STARTS_WITH },
        { key: 'assetId', threshold: matchSorter.rankings.CONTAINS },
      ],
    })

    return limit ? matchedAssets.slice(0, limit) : matchedAssets
  },
)

export const selectPortfolioPrimaryAssetsByChain = createDeepEqualOutputSelector(
  selectPortfolioFungiblePrimaryAssetsSortedByBalance,
  selectRelatedAssetIdsByAssetIdInclusive,
  selectAssets,
  (_state: ReduxState, chainId: ChainId | 'All') => chainId,
  (portfolioAssets, relatedAssetIdsById, allAssets, chainId) => {
    if (chainId === 'All') return portfolioAssets

    const chainAssets: Asset[] = []

    // This selector name may be a misnomer - if a chain is selected, there is no such thing as a "primary" asset
    // as we want to select and display only the chain-specific flavour
    for (const asset of portfolioAssets) {
      if (asset.chainId === chainId) {
        // Asset is already on the selected chain
        chainAssets.push(asset)
      } else {
        const relatedAssetIds = relatedAssetIdsById[asset.assetId] ?? []
        const maybeChainVariant = relatedAssetIds.find(
          asset => fromAssetId(asset).chainId === chainId,
        )
        const maybeAsset = allAssets[maybeChainVariant ?? '']

        if (maybeAsset) {
          chainAssets.push(maybeAsset)
        }
      }
    }

    return chainAssets
  },
)

export const selectPrimaryAssetsByChain = createDeepEqualOutputSelector(
  selectPrimaryAssetsSortedByMarketCap,
  selectRelatedAssetIdsByAssetIdInclusive,
  selectAssets,
  (_state: ReduxState, chainId: ChainId | 'All') => chainId,
  (primaryAssets, relatedAssetIdsById, allAssets, chainId) => {
    if (chainId === 'All') return primaryAssets

    const chainAssets: Asset[] = []

    // This selector name may be a misnomer - if a chain is selected, there is no such thing as a "primary" asset
    // as we want to select and display only the chain-specific flavour
    for (const asset of primaryAssets) {
      if (asset.chainId === chainId) {
        // Asset is already on the selected chain
        chainAssets.push(asset)
      } else {
        const relatedAssetIds = relatedAssetIdsById[asset.assetId] ?? []
        const maybeChainVariant = relatedAssetIds.find(
          asset => fromAssetId(asset).chainId === chainId,
        )
        const maybeAsset = allAssets[maybeChainVariant ?? '']

        if (maybeAsset) {
          chainAssets.push(maybeAsset)
        }
      }
    }

    return chainAssets
  },
)
