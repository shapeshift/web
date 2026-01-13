import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'

export const assetToStonfiAddress = (asset: Asset): string | null => {
  if (asset.chainId !== KnownChainIds.TonMainnet) {
    return null
  }

  const { assetNamespace, assetReference } = fromAssetId(asset.assetId)

  if (assetNamespace === 'slip44') {
    return 'native'
  }

  if (assetNamespace === 'jetton') {
    return assetReference
  }

  return null
}

export const isTonAsset = (asset: Asset): boolean => {
  return asset.chainId === KnownChainIds.TonMainnet
}
