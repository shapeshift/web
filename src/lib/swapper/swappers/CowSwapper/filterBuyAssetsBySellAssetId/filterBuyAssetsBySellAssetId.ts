import type { AssetId } from '@shapeshiftoss/caip'
import type { BuyAssetBySellIdInput } from 'lib/swapper/api'

import { isNativeEvmAsset } from '../../utils/helpers/helpers'
import { COWSWAP_UNSUPPORTED_ASSETS } from '../utils/blacklist'
import { getSupportedChainIds } from '../utils/helpers/helpers'

export const filterBuyAssetsBySellAssetId = ({
  assets,
  sellAsset,
}: BuyAssetBySellIdInput): AssetId[] => {
  const supportedChainIds = getSupportedChainIds()

  if (
    sellAsset === undefined ||
    !supportedChainIds.includes(sellAsset.chainId) ||
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
