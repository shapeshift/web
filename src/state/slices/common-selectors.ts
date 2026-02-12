import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAccountId, fromAssetId, isNft } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { Asset, PartialRecord } from '@shapeshiftoss/types'
import { BigAmount } from '@shapeshiftoss/utils'
import orderBy from 'lodash/orderBy'
import pickBy from 'lodash/pickBy'
import createCachedSelector from 're-reselect'
import { createSelector } from 'reselect'

import {
  selectAssets,
  selectPrimaryAssets,
  selectPrimaryAssetsSortedByMarketCap,
  selectPrimaryAssetsSortedByMarketCapNoSpam,
} from './assetsSlice/selectors'
import { getFeeAssetByChainId } from './assetsSlice/utils'
import { marketData } from './marketDataSlice/marketDataSlice'
import {
  selectMarketDataByAssetIdUserCurrency,
  selectMarketDataUserCurrency,
} from './marketDataSlice/selectors'
import { portfolio } from './portfolioSlice/portfolioSlice'
import { preferences } from './preferencesSlice/preferencesSlice'

import {
  deduplicateAssets,
  MINIMUM_MARKET_CAP_THRESHOLD,
  searchAssets,
  shouldSearchAllAssets as shouldSearchAllAssetsUtil,
} from '@/lib/assetSearch'
import { bn, bnOrZero } from '@/lib/bignumber/bignumber'
import { isSome } from '@/lib/utils'
import { isContractAddress } from '@/lib/utils/isContractAddress'
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

export const selectPartitionedAccountIds = createDeepEqualOutputSelector(
  selectEnabledWalletAccountIds,
  accountIds => {
    const evmAccountIds: AccountId[] = []
    const nonEvmAccountIds: AccountId[] = []

    accountIds.forEach(accountId => {
      const { chainId } = fromAccountId(accountId)
      if (isEvmChainId(chainId)) {
        evmAccountIds.push(accountId)
      } else {
        nonEvmAccountIds.push(accountId)
      }
    })

    return { evmAccountIds, nonEvmAccountIds }
  },
)

export const selectAccountIdsWithoutEvms = createDeepEqualOutputSelector(
  selectEnabledWalletAccountIds,
  accountIds => accountIds.filter(accountId => !isEvmChainId(fromAccountId(accountId).chainId)),
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

export const selectPortfolioAccountBalances = createDeepEqualOutputSelector(
  selectEnabledWalletAccountIds,
  portfolio.selectors.selectAccountBalancesById,
  selectAssets,
  (walletAccountIds, accountBalancesById, assets) => {
    const filtered = pickBy(accountBalancesById, (_balances, accountId: AccountId) =>
      walletAccountIds.includes(accountId),
    )
    const result: Record<AccountId, Record<AssetId, BigAmount>> = {}
    for (const [accountId, byAssetId] of Object.entries(filtered)) {
      const assetBalances: Record<AssetId, BigAmount> = {}
      for (const [assetId, balance] of Object.entries(byAssetId)) {
        const precision = assets[assetId as AssetId]?.precision ?? 0
        assetBalances[assetId as AssetId] = BigAmount.fromBaseUnit({
          value: balance,
          precision,
          assetId,
        })
      }
      result[accountId as AccountId] = assetBalances
    }
    return result
  },
)

export const selectPortfolioAssetBalancesIncludingZeroBalances = createDeepEqualOutputSelector(
  selectPortfolioAccountBalances,
  (accountBalancesById): Record<AssetId, BigAmount> =>
    Object.values(accountBalancesById).reduce<Record<AssetId, BigAmount>>((acc, byAssetId) => {
      Object.entries(byAssetId).forEach(([assetId, balance]) => {
        acc[assetId as AssetId] = acc[assetId as AssetId]
          ? acc[assetId as AssetId].plus(balance)
          : balance
      })
      return acc
    }, {}),
)

export const selectPortfolioAssetBalances = createDeepEqualOutputSelector(
  selectPortfolioAssetBalancesIncludingZeroBalances,
  (assetBalancesById): Record<AssetId, BigAmount> => {
    return pickBy(assetBalancesById, balance => !balance.isZero()) as Record<AssetId, BigAmount>
  },
)

export const selectPortfolioCryptoBalanceByFilter = createCachedSelector(
  selectAssets,
  selectPortfolioAccountBalances,
  selectPortfolioAssetBalances,
  selectAccountIdParamFromFilter,
  selectAssetIdParamFromFilter,
  (assets, accountBalances, assetBalances, accountId, assetId): BigAmount => {
    if (!assetId) return BigAmount.zero({ precision: 0 })
    const asset = assets?.[assetId]
    if (!asset) return BigAmount.zero({ precision: 0 })

    const balance = accountId ? accountBalances?.[accountId]?.[assetId] : assetBalances[assetId]

    return balance ?? BigAmount.zero({ precision: asset.precision, assetId })
  },
)({
  keySelector: (_s: ReduxState, filter) =>
    `${filter?.accountId ?? 'accountId'}-${filter?.assetId ?? 'assetId'}`,
  selectorCreator: createDeepEqualOutputSelector,
})

export const selectPortfolioUserCurrencyBalances = createDeepEqualOutputSelector(
  selectAssets,
  selectMarketDataUserCurrency,
  selectPortfolioAssetBalances,
  preferences.selectors.selectBalanceThresholdUserCurrency,
  preferences.selectors.selectSpamMarkedAssetIds,
  (assetsById, marketData, balances, balanceThresholdUserCurrency, spamMarkedAssetIds) => {
    const spamAssetIdsSet = new Set(spamMarkedAssetIds)
    return Object.entries(balances).reduce<Record<AssetId, string>>((acc, [assetId, balance]) => {
      const asset = assetsById[assetId]
      if (!asset) return acc
      if (spamAssetIdsSet.has(assetId)) return acc
      const precision = asset.precision
      if (precision === undefined) return acc
      const price = marketData[assetId]?.price
      const assetUserCurrencyBalance = balance.times(price)
      if (assetUserCurrencyBalance.lt(balanceThresholdUserCurrency)) return acc
      acc[assetId] = assetUserCurrencyBalance.toFixed(2)
      return acc
    }, {})
  },
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

export const selectPortfolioAssetBalancesByAssetIdUserCurrency = createDeepEqualOutputSelector(
  selectAssets,
  selectMarketDataUserCurrency,
  selectPortfolioAssetBalances,
  preferences.selectors.selectBalanceThresholdUserCurrency,
  (assetsById, marketData, balances, balanceThresholdUserCurrency) =>
    Object.entries(balances).reduce<Record<AssetId, string>>((acc, [assetId, balance]) => {
      const asset = assetsById[assetId]

      if (!asset) return acc
      if (acc[assetId]) return acc
      const precision = asset.precision
      if (precision === undefined) return acc
      const price = marketData[assetId]?.price

      const assetUserCurrencyBalance = balance.times(price)

      if (assetUserCurrencyBalance.lt(balanceThresholdUserCurrency)) return acc
      acc[assetId] = assetUserCurrencyBalance.toFixed(2)
      return acc
    }, {}),
)

export const selectPortfolioPrimaryAssetBalancesByAssetIdUserCurrency =
  createDeepEqualOutputSelector(
    selectAssets,
    selectMarketDataUserCurrency,
    selectPortfolioAssetBalances,
    selectRelatedAssetIdsByAssetIdInclusive,
    preferences.selectors.selectBalanceThresholdUserCurrency,
    (assetsById, marketData, balances, relatedAssetIdsById, balanceThresholdUserCurrency) =>
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

        const totalCryptoBalanceCryptoPrecision = relatedAssetIdsById[primaryAssetId]?.reduce(
          (innerAcc, relatedAssetId) => {
            const relatedBalance = balances[relatedAssetId]
            return innerAcc.plus(bn(relatedBalance?.toPrecision() ?? '0'))
          },
          bnOrZero(0),
        )

        const assetUserCurrencyBalance = bnOrZero(totalCryptoBalanceCryptoPrecision).times(
          bnOrZero(price),
        )

        if (assetUserCurrencyBalance.lt(bnOrZero(balanceThresholdUserCurrency))) return acc

        acc[primaryAssetId] = assetUserCurrencyBalance.toFixed(2)

        return acc
      }, {}),
  )

export const selectPortfolioUserCurrencyBalancesByAccountId = createDeepEqualOutputSelector(
  selectAssets,
  selectPortfolioAccountBalances,
  selectMarketDataUserCurrency,
  (assetsById, accounts, marketData) => {
    return Object.entries(accounts).reduce<
      PartialRecord<AccountId, PartialRecord<AssetId, string>>
    >((acc, [accountId, balanceObj]) => {
      acc[accountId as AccountId] = Object.entries(balanceObj as Record<AssetId, BigAmount>).reduce<
        PartialRecord<AssetId, string>
      >((balanceByAssetId, [assetId, balance]) => {
        const asset = assetsById[assetId]
        if (!asset) return balanceByAssetId
        const price = marketData[assetId]?.price ?? 0
        const userCurrencyBalance = balance.times(price).toFixed(2)
        balanceByAssetId[assetId as AssetId] = userCurrencyBalance

        return balanceByAssetId
      }, {})

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
    selectPortfolioAssetBalances,
    selectPortfolioUserCurrencyBalances,
    marketData.selectors.selectMarketDataUsd,
    (assets, portfolioBalances, portfolioBalancesUserCurrency, marketDataUsd) => {
      const getAssetBalanceCryptoPrecision = (asset: Asset) =>
        portfolioBalances[asset.assetId]?.toNumber() ?? 0

      const getAssetUserCurrencyBalance = (asset: Asset) =>
        bnOrZero(portfolioBalancesUserCurrency[asset.assetId]).toNumber()

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
    selectPortfolioAssetBalances,
    selectPortfolioUserCurrencyBalances,
    marketData.selectors.selectMarketDataUsd,
    selectRelatedAssetIdsByAssetIdInclusive,
    (
      assets,
      portfolioBalances,
      portfolioBalancesUserCurrency,
      marketDataUsd,
      relatedAssetIdsById,
    ) => {
      const getAssetBalanceCryptoPrecision = (asset: Asset) => {
        if (asset.isChainSpecific) return portfolioBalances[asset.assetId]?.toNumber() ?? 0

        const primaryAssetTotalCryptoBalance = relatedAssetIdsById[asset.assetId]?.reduce(
          (acc, relatedAssetId) => {
            return acc.plus(bn(portfolioBalances[relatedAssetId]?.toPrecision() ?? '0'))
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

export const selectPortfolioFungibleAssetsSortedByBalance = createDeepEqualOutputSelector(
  selectPortfolioAssetBalancesByAssetIdUserCurrency,
  selectAssets,
  (portfolioUserCurrencyBalances, assets) => {
    const getAssetBalance = ([_assetId, balance]: [AssetId, string]) => {
      const asset = assets[_assetId]
      if (!asset) return 0
      if (asset.isChainSpecific) return bnOrZero(balance).toNumber()

      const assetBalanceUserCurrency = bnOrZero(portfolioUserCurrencyBalances[asset.assetId])

      return assetBalanceUserCurrency.toNumber()
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

export const selectPortfolioFungiblePrimaryAssetsSortedByBalance = createDeepEqualOutputSelector(
  selectPortfolioPrimaryAssetBalancesByAssetIdUserCurrency,
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
  selectPrimaryAssetsSortedByMarketCapNoSpam,
  selectAssetsSortedByMarketCapUserCurrencyBalanceCryptoPrecisionAndName,
  marketData.selectors.selectMarketDataUsd,
  selectSearchQueryFromFilter,
  selectLimitParamFromFilter,
  (primaryAssets, allAssets, marketDataUsd, searchQuery, limit): Asset[] => {
    if (!searchQuery) return primaryAssets.slice(0, limit)

    const isContractAddressSearch = isContractAddress(searchQuery)
    const primaryAssetIds = new Set(primaryAssets.map(a => a.assetId))
    const primarySymbols = new Set(primaryAssets.map(a => a.symbol.toLowerCase()))

    // Note: Unlike the worker's handleSearch, this selector doesn't have an activeChainId check
    // because it's used for global search (header) which always searches across all chains.
    // The worker adds `activeChainId !== 'All'` for trade asset search with chain filtering.
    const useAllAssets =
      isContractAddressSearch ||
      shouldSearchAllAssetsUtil(searchQuery, allAssets, primaryAssetIds, primarySymbols)

    const sortedAssets = useAllAssets ? allAssets : primaryAssets

    // Filter out spam tokens (low market cap) but keep assets with no market data
    const filteredAssets = sortedAssets.filter(asset => {
      const marketCap = bnOrZero(marketDataUsd[asset.assetId]?.marketCap)
      return marketCap.isZero() || marketCap.gte(MINIMUM_MARKET_CAP_THRESHOLD)
    })

    const matchedAssets = searchAssets(searchQuery, filteredAssets)
    const deduplicated = deduplicateAssets(matchedAssets, searchQuery)

    return limit ? deduplicated.slice(0, limit) : deduplicated
  },
)((_state: ReduxState, filter) => filter?.searchQuery ?? 'assetsBySearchQuery')

export const selectPortfolioAssetsByChainId = createDeepEqualOutputSelector(
  selectPortfolioFungiblePrimaryAssetsSortedByBalance,
  selectPortfolioFungibleAssetsSortedByBalance,
  (_state: ReduxState, chainId: ChainId | 'All') => chainId,
  (portfolioPrimaryAssets, portfolioAssets, chainId) => {
    if (chainId === 'All') return portfolioPrimaryAssets

    const chainAssets: Asset[] = portfolioAssets.filter(asset => asset.chainId === chainId)

    return chainAssets
  },
)

export const selectPrimaryAssetsByChainId = createDeepEqualOutputSelector(
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
