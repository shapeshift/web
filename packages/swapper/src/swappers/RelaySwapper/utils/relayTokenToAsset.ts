import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'

import { relayTokenToAssetId } from './relayTokenToAssetId'
import type { RelayToken } from './types'

export const relayTokenToAsset = (
  relayToken: RelayToken,
  assets: Partial<Record<AssetId, Asset>>,
): Asset => {
  const assetId = relayTokenToAssetId(relayToken)
  const maybeAsset = assets[assetId]
  if (maybeAsset) return maybeAsset

  // It shouldn't happen but...
  // asset not known by shapeshift
  // create a placeholder asset using the data we have
  return {
    assetId,
    chainId: relayToken.chainId,
    name: relayToken.name,
    precision: relayToken.decimals,
    symbol: relayToken.symbol,
    color: '#000000',
    icon: relayToken.metadata.logoURI ?? '',
    explorer: '',
    explorerTxLink: '',
    explorerAddressLink: '',
    relatedAssetKey: null,
  }
}
