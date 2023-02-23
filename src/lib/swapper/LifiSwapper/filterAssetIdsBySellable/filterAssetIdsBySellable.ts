import type { TokensResponse } from '@lifi/sdk'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { evmChainIds } from '@shapeshiftoss/chain-adapters'

export function filterAssetIdsBySellable(
  assetIds: AssetId[],
  tokens: TokensResponse['tokens'],
  assetIdMap: Partial<Record<AssetId, Asset>>,
): AssetId[] {
  const result = assetIds.filter(id => {
    const asset = assetIdMap[id]

    if (asset === undefined) return false

    const { chainId, symbol } = asset
    const { chainReference } = fromAssetId(id)

    return (
      (evmChainIds as readonly string[]).includes(chainId) &&
      // TODO: dont coerce to number here, instead do a proper lookup
      tokens[Number(chainReference)].some(token => token.symbol === symbol)
    )
  })

  return result
}
