import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { makeAsset } from '@shapeshiftoss/utils'

import { relayTokenToAssetId } from './relayTokenToAssetId'
import type { RelayToken } from './types'

export const relayTokenToAsset = (
  relayToken: RelayToken,
  assets: Partial<Record<AssetId, Asset>>,
): Asset => {
  const assetId = relayTokenToAssetId(relayToken)
  const maybeAsset = assets[assetId]
  if (maybeAsset) return maybeAsset

  const chainId = fromAssetId(assetId).chainId

  // It shouldn't happen but...
  // asset not known by shapeshift
  // create a placeholder asset using the data we have
  const unknownAsset = makeAsset(assets, {
    assetId,
    chainId,
    name: relayToken.name,
    precision: relayToken.decimals,
    symbol: relayToken.symbol,
  })

  return unknownAsset
}
