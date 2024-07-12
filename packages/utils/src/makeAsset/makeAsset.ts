import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'

import { chainIdToFeeAsset } from '../chainIdToFeeAsset'
import { sha256 } from '../sha256'

export type MinimalAsset = Partial<Asset> & Pick<Asset, 'assetId' | 'symbol' | 'name' | 'precision'>

/**
 * utility to create an asset from minimal asset data from external sources at runtime
 * e.g. zapper/zerion/etherscan
 * required fields are assetId, symbol, name, precision
 * the rest can be inferred from existing data
 */
export const makeAsset = (
  assetsById: Partial<Record<AssetId, Asset>>,
  minimalAsset: MinimalAsset,
  isCustomToken = false,
): Asset => {
  const { assetId } = minimalAsset

  const color = (() => {
    if (minimalAsset.color) return minimalAsset.color
    const shaAssetId = sha256(assetId)
    return `#${shaAssetId.slice(0, 6)}`
  })()

  const chainId = (() => {
    if (minimalAsset.chainId) return minimalAsset.chainId
    return fromAssetId(assetId).chainId
  })()

  // currently, dynamic assets are LP pairs, and they have two icon urls and are rendered differently
  const icon = minimalAsset?.icon ?? ''

  type ExplorerLinks = Pick<Asset, 'explorer' | 'explorerTxLink' | 'explorerAddressLink'>

  const explorerLinks = ((): ExplorerLinks => {
    const feeAsset = chainIdToFeeAsset(assetsById, chainId)
    return {
      explorer: feeAsset?.explorer ?? '',
      explorerTxLink: feeAsset?.explorerTxLink ?? '',
      explorerAddressLink: feeAsset?.explorerAddressLink ?? '',
    }
  })()

  return Object.assign({}, minimalAsset, explorerLinks, { chainId, color, icon, isCustomToken })
}
