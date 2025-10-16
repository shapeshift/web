import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'

export const getUniqueChainIdsFromAssetIds = (assetIds: AssetId[]): ChainId[] => {
  const seenChains = new Set<string>()
  const chainIds: ChainId[] = []

  for (const assetId of assetIds) {
    const { chainId } = fromAssetId(assetId)

    // Skip if we've already processed this chain
    if (seenChains.has(chainId)) continue
    seenChains.add(chainId)

    chainIds.push(chainId as ChainId)
  }

  return chainIds
}
