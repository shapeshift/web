import type { AssetId, AssetNamespace, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'

import { getAssetService } from './service/AssetService'

type KnownToken = {
  assetId: AssetId
  contractAddress: string
  symbol: string
  name: string
  precision: number
}

// Adapters read their known tokens on every account fetch, so the scan of all assets only reruns when the assets change
export const createGetKnownTokens = (
  chainId: ChainId,
  assetNamespace: AssetNamespace,
  toContractAddress: (assetReference: string) => string = assetReference => assetReference,
) => {
  let scannedAssets: Asset[] | undefined
  let knownTokens: KnownToken[] = []

  return (): KnownToken[] => {
    const { assets } = getAssetService()
    if (assets === scannedAssets) return knownTokens

    scannedAssets = assets
    knownTokens = assets
      .filter(asset => asset.chainId === chainId)
      .flatMap(asset => {
        const { assetNamespace: namespace, assetReference } = fromAssetId(asset.assetId)
        if (namespace !== assetNamespace) return []

        return [
          {
            assetId: asset.assetId,
            contractAddress: toContractAddress(assetReference),
            symbol: asset.symbol,
            name: asset.name,
            precision: asset.precision,
          },
        ]
      })

    return knownTokens
  }
}
