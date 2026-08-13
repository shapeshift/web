import type { AssetId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'

export const isToken = (assetId: AssetId) => {
  switch (fromAssetId(assetId).assetNamespace) {
    case ASSET_NAMESPACE.erc20:
    case ASSET_NAMESPACE.erc721:
    case ASSET_NAMESPACE.erc1155:
    case ASSET_NAMESPACE.splToken:
    case ASSET_NAMESPACE.trc20:
    case ASSET_NAMESPACE.suiCoin:
    case ASSET_NAMESPACE.starknetToken:
    case ASSET_NAMESPACE.nep141:
    case ASSET_NAMESPACE.jetton:
      return true
    default:
      return false
  }
}
