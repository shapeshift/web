import type { AssetId } from '@shapeshiftoss/caip'

import { SUPPORTED_CHAIN_IDS } from '../../../cowswap-utils/constants'
import type { BuyAssetBySellIdInput } from '../../../types'
import { isNativeEvmAsset } from '../../utils/helpers/helpers'
import { COWSWAP_UNSUPPORTED_ASSETS } from '../utils/blacklist'

export const filterBuyAssetsBySellAssetId = ({
  assets,
  sellAsset,
}: BuyAssetBySellIdInput): AssetId[] => {
  if (
    sellAsset === undefined ||
    !SUPPORTED_CHAIN_IDS.includes(sellAsset.chainId) ||
    isNativeEvmAsset(sellAsset.assetId) ||
    COWSWAP_UNSUPPORTED_ASSETS.includes(sellAsset.assetId)
  ) {
    return []
  }

  return assets
    .filter(asset => {
      return (
        asset.assetId !== sellAsset.assetId &&
        sellAsset.chainId === asset.chainId &&
        !COWSWAP_UNSUPPORTED_ASSETS.includes(asset.assetId)
      )
    })
    .map(asset => asset.assetId)
}
