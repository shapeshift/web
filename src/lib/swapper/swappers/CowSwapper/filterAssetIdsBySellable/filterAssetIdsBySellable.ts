import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { isNft } from '@shapeshiftoss/caip'
import type { Asset } from 'lib/asset-service'

import { isNativeEvmAsset } from '../../utils/helpers/helpers'
import { COWSWAP_UNSUPPORTED_ASSETS } from '../utils/blacklist'

export const filterAssetIdsBySellable = (
  assetIds: AssetId[],
  assets: Partial<Record<AssetId, Asset>>,
  supportedChainIds: ChainId[],
): AssetId[] => {
  return assetIds.filter(id => {
    const asset = assets[id]
    if (!asset) return false

    return (
      supportedChainIds.includes(asset.chainId) &&
      !COWSWAP_UNSUPPORTED_ASSETS.includes(id) &&
      !isNativeEvmAsset(id) &&
      !isNft(id)
    )
  })
}
