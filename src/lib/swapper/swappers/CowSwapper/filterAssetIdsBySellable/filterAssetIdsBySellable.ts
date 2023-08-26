import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset } from 'lib/asset-service'

import { isNativeEvmAsset } from '../../utils/helpers/helpers'
import { COWSWAP_UNSUPPORTED_ASSETS } from '../utils/blacklist'
import { getSupportedChainIds } from '../utils/helpers/helpers'

export const filterAssetIdsBySellable = (assets: Asset[]): AssetId[] => {
  const supportedChainIds = getSupportedChainIds()
  return assets
    .filter(asset => {
      return (
        supportedChainIds.includes(asset.chainId) &&
        !COWSWAP_UNSUPPORTED_ASSETS.includes(asset.assetId) &&
        !isNativeEvmAsset(asset.assetId)
      )
    })
    .map(asset => asset.assetId)
}
