import type { Token } from '@lifi/sdk'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { evmChainIds } from '@shapeshiftoss/chain-adapters'
import type { BuyAssetBySellIdInput } from '@shapeshiftoss/swapper'

export function filterBuyAssetsBySellAssetId(
  input: BuyAssetBySellIdInput,
  tokenMap: Map<string, Pick<Token, 'decimals' | 'symbol'>>,
  assetIdMap: Partial<Record<AssetId, Asset>>,
): AssetId[] {
  const { assetIds = [], sellAssetId } = input

  const sellAssetChainId = fromAssetId(sellAssetId).chainId

  const result = assetIds.filter(id => {
    const assetChainId = fromAssetId(id).chainId
    const symbol = assetIdMap[id]?.symbol

    return (
      assetChainId !== sellAssetChainId && // no same-chain swaps
      (evmChainIds as readonly string[]).includes(assetChainId) &&
      (evmChainIds as readonly string[]).includes(sellAssetChainId) &&
      symbol !== undefined &&
      tokenMap.has(symbol)
    )
  })

  return result
}
