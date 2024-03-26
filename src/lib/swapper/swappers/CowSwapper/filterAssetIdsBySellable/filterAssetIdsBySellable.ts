import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'

import { isNativeEvmAsset } from '../../utils/helpers/helpers'
import { COWSWAP_UNSUPPORTED_ASSETS } from '../utils/blacklist'
import { SUPPORTED_CHAIN_IDS } from '../utils/constants'

export const filterAssetIdsBySellable = (assets: Asset[]): AssetId[] => {
  return assets
    .filter(asset => {
      return (
        SUPPORTED_CHAIN_IDS.includes(asset.chainId) &&
        !COWSWAP_UNSUPPORTED_ASSETS.includes(asset.assetId) &&
        !isNativeEvmAsset(asset.assetId)
      )
    })
    .map(asset => asset.assetId)
}
