import { Asset } from '@shapeshiftoss/asset-service'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { BuyAssetBySellIdInput } from 'lib/swapper/api'
import { selectAssets } from 'state/slices/selectors'
import { store } from 'state/store'

const getSameChainEvmAssetsPredicate = (sellAssetChainId: ChainId, assets: Partial<Record<AssetId, Asset>>) => (assetId: AssetId): boolean => {
  const buyAsset = assets[assetId]

  if (buyAsset === undefined) return false

  // same-chain swaps and evm only
  return buyAsset.chainId === sellAssetChainId && isEvmChainId(buyAsset.chainId)
}

const getCrossChainEvmAssetsPredicate = (sellAssetChainId: ChainId, assets: Partial<Record<AssetId, Asset>>) => (assetId: AssetId): boolean => {
  const buyAsset = assets[assetId]

  if (buyAsset === undefined) return false

  // cross-chain swaps and evm only
  return buyAsset.chainId !== sellAssetChainId && isEvmChainId(buyAsset.chainId)
}

const _filterEvmBuyAssetsBySellAssetId = (input: BuyAssetBySellIdInput, getPredicate: (chainId: ChainId, assets: Partial<Record<AssetId, Asset>>) => (assetId: AssetId) => boolean): AssetId[] => {
  const { assetIds = [], sellAssetId } = input

  const assets = selectAssets(store.getState())
  const sellAsset = assets[sellAssetId]

  if (sellAsset === undefined || !isEvmChainId(sellAsset.chainId)) return []

  const predicate = getPredicate(sellAsset.chainId, assets)
  return assetIds.filter(predicate)
}

export const filterSameChainEvmBuyAssetsBySellAssetId = (input: BuyAssetBySellIdInput): AssetId[] => {
  return _filterEvmBuyAssetsBySellAssetId(input, getSameChainEvmAssetsPredicate)
}

export const filterCrossChainEvmBuyAssetsBySellAssetId = (input: BuyAssetBySellIdInput): AssetId[] => {
  return _filterEvmBuyAssetsBySellAssetId(input, getCrossChainEvmAssetsPredicate)
}
