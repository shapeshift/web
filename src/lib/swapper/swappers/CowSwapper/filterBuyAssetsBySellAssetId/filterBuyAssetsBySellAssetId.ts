import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { isNft } from '@shapeshiftoss/caip'
import type { Asset } from 'lib/asset-service'
import type { BuyAssetBySellIdInput } from 'lib/swapper/api'

import { isNativeEvmAsset } from '../../utils/helpers/helpers'
import { COWSWAP_UNSUPPORTED_ASSETS } from '../utils/blacklist'

export const filterBuyAssetsBySellAssetId = (
  { assetIds = [], sellAssetId }: BuyAssetBySellIdInput,
  assets: Partial<Record<AssetId, Asset>>,
  supportedChainIds: ChainId[],
): AssetId[] => {
  const sellAsset = assets[sellAssetId]

  if (
    sellAsset === undefined ||
    !supportedChainIds.includes(sellAsset.chainId) ||
    isNativeEvmAsset(sellAssetId) ||
    COWSWAP_UNSUPPORTED_ASSETS.includes(sellAssetId)
  )
    return []

  return assetIds.filter(id => {
    const asset = assets[id]
    if (!asset) return false

    return (
      id !== sellAssetId &&
      sellAsset.chainId === asset.chainId &&
      !COWSWAP_UNSUPPORTED_ASSETS.includes(id) &&
      !isNft(id)
    )
  })
}
