import type { Token } from '@lifi/sdk'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { evmChainIds } from '@shapeshiftoss/chain-adapters'

export function filterAssetIdsBySellable(
  assetIds: AssetId[],
  tokenMap: Map<string, Pick<Token, 'decimals' | 'symbol'>>,
  assetIdMap: Partial<Record<AssetId, Asset>>,
): AssetId[] {
  const result = assetIds.filter(id => {
    const symbol = assetIdMap[id]?.symbol
    return (
      (evmChainIds as readonly string[]).includes(fromAssetId(id).chainId) &&
      symbol !== undefined &&
      tokenMap.has(symbol)
    )
  })

  return result
}
