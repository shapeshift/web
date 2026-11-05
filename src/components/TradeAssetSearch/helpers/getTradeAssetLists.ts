import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type { Asset, AssetsByIdPartial, PartialRecord } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'

import { filterAssetsForWallet } from './filterAssetsForWallet'

import { isSome } from '@/lib/utils'

export const NUM_QUICK_ACCESS_ASSETS = 6

export type GetTradeAssetListsArgs = {
  activeChainId: ChainId | 'All'
  popularAssets: Asset[]
  portfolioAssets: Asset[]
  hasPortfolio: boolean
  hasWallet: boolean
  allowWalletUnsupportedAssets?: boolean
  walletConnectedChainIds: ChainId[]
  assetFilterPredicate?: (assetId: AssetId) => boolean
  chainIdFilterPredicate?: (chainId: ChainId) => boolean
  assetsById: AssetsByIdPartial
  relatedAssetIndex: PartialRecord<AssetId, AssetId[]>
  spamMarkedAssetIds: AssetId[]
}

export type TradeAssetLists = {
  quickAccessAssets: Asset[]
  portfolioRows: Asset[]
  popularRows: Asset[]
}

const getQuickAccessAssets = (popularAssets: Asset[], activeChainId: ChainId | 'All'): Asset[] => {
  if (activeChainId !== 'All') return popularAssets.slice(0, NUM_QUICK_ACCESS_ASSETS)

  // if we selected 'All' chains, we'll dedupe EVM assets in favor of ethereum mainnet
  const resultMap: Record<AssetId, Asset> = {}
  for (const asset of popularAssets) {
    if (Object.keys(resultMap).length === NUM_QUICK_ACCESS_ASSETS) break

    const key = asset.relatedAssetKey ?? asset.assetId

    // set first occurrence, overwrite with the first eth mainnet one
    const isFirstEthMainnetAsset =
      asset.chainId === KnownChainIds.EthereumMainnet &&
      resultMap[key]?.chainId !== KnownChainIds.EthereumMainnet
    if (resultMap[key] === undefined || isFirstEthMainnetAsset) {
      resultMap[key] = asset
    }
  }

  return Object.values(resultMap)
}

export const getTradeAssetLists = ({
  activeChainId,
  popularAssets,
  portfolioAssets,
  hasPortfolio,
  hasWallet,
  allowWalletUnsupportedAssets,
  walletConnectedChainIds,
  assetFilterPredicate,
  chainIdFilterPredicate,
  assetsById,
  relatedAssetIndex,
  spamMarkedAssetIds,
}: GetTradeAssetListsArgs): TradeAssetLists => {
  // Same variants as the grouped rows, which also leave out spam
  const getRelatedAssets = (asset: Asset) => {
    const relatedAssetKey = asset.relatedAssetKey ?? asset.assetId
    return [...new Set([relatedAssetKey, ...(relatedAssetIndex[relatedAssetKey] ?? [])])]
      .filter(assetId => !spamMarkedAssetIds.includes(assetId))
      .map(assetId => assetsById[assetId])
      .filter(isSome)
      .filter(relatedAsset => chainIdFilterPredicate?.(relatedAsset.chainId) ?? true)
  }

  const walletFilterArgs = {
    hasWallet,
    allowWalletUnsupportedAssets,
    walletConnectedChainIds,
    assetFilterPredicate,
    getRelatedAssets,
  }

  const quickAccessAssets = getQuickAccessAssets(
    filterAssetsForWallet({ ...walletFilterArgs, assets: popularAssets }),
    activeChainId,
  )
  const portfolioRows = filterAssetsForWallet({
    ...walletFilterArgs,
    assets: portfolioAssets,
    groupVariants: true,
  })
  const popularRows = filterAssetsForWallet({
    ...walletFilterArgs,
    assets: popularAssets,
    groupVariants: true,
  })

  if (!hasPortfolio) return { quickAccessAssets, portfolioRows, popularRows }

  // A chain tab lists each variant, All lists one row per family and symbol, e.g. USDC apart from AXLUSDC
  const toRowKey = (asset: Asset) =>
    activeChainId === 'All' ? `${asset.relatedAssetKey ?? asset.assetId}:${asset.symbol}` : asset.assetId
  const portfolioRowKeys = new Set(portfolioRows.map(toRowKey))

  return {
    quickAccessAssets,
    portfolioRows,
    popularRows: popularRows.filter(asset => !portfolioRowKeys.has(toRowKey(asset))),
  }
}
