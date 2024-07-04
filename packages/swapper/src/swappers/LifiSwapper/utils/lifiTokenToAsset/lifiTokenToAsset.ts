import type { Token } from '@lifi/sdk'
import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'

import { lifiChainIdToChainId } from '../lifiChainIdtoChainId/lifiChainIdToChainId'
import { lifiTokenToAssetId } from '../lifiTokenToAssetId/lifiTokenToAssetId'

export const lifiTokenToAsset = (
  lifiToken: Token,
  assets: Partial<Record<AssetId, Asset>>,
): Asset => {
  const assetId = lifiTokenToAssetId(lifiToken)
  const maybeAsset = assets[assetId]
  if (maybeAsset) return maybeAsset

  // asset not known by shapeshift
  // create a placeholder asset using the data we have
  return {
    assetId,
    chainId: lifiChainIdToChainId(lifiToken.chainId),
    name: lifiToken.name,
    precision: lifiToken.decimals,
    symbol: lifiToken.symbol,
    color: '#000000',
    icon: lifiToken.logoURI ?? '',
    iconLarge: lifiToken.logoURI ?? '',
    explorer: '',
    explorerTxLink: '',
    explorerAddressLink: '',
  }
}
