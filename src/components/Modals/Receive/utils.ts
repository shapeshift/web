import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'

import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'

export type ChainData = {
  chainId: string
  icon?: string
  name: string
}

/**
 * Gets unique chain data from an array of asset IDs
 * @param assetIds - Array of asset IDs to extract chain data from
 * @param assetsById - Assets state keyed by asset ID
 * @returns Array of unique chains with their icons and names
 */
export const getUniqueChainDataFromAssetIds = (
  assetIds: AssetId[],
  assetsById: Partial<Record<AssetId, Asset>>,
): ChainData[] => {
  const chainAdapterManager = getChainAdapterManager()
  const seenChains = new Set<string>()
  const chainData: ChainData[] = []

  for (const assetId of assetIds) {
    const { chainId } = fromAssetId(assetId)

    // Skip if we've already processed this chain
    if (seenChains.has(chainId)) continue
    seenChains.add(chainId)

    // Find the fee asset for this chain
    const feeAssetId = chainAdapterManager.get(chainId)?.getFeeAssetId()
    const feeAsset = feeAssetId ? assetsById[feeAssetId] : undefined

    chainData.push({
      chainId,
      icon: feeAsset?.networkIcon ?? feeAsset?.icon,
      name: chainAdapterManager.get(chainId)?.getDisplayName() ?? chainId,
    })
  }

  return chainData
}
