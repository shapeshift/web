import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'

export type FilterAssetsForWalletArgs = {
  assets: Asset[]
  hasWallet: boolean
  allowWalletUnsupportedAssets?: boolean
  walletConnectedChainIds: ChainId[]
  assetFilterPredicate?: (assetId: AssetId) => boolean
  getRelatedAssets?: (asset: Asset) => Asset[]
}

export const filterAssetsForWallet = ({
  assets,
  hasWallet,
  allowWalletUnsupportedAssets,
  walletConnectedChainIds,
  assetFilterPredicate,
  getRelatedAssets,
}: FilterAssetsForWalletArgs): Asset[] => {
  const isAssetAllowed = (asset: Asset) => assetFilterPredicate?.(asset.assetId) ?? true
  const filteredAssets = assets.filter(isAssetAllowed)

  if (!hasWallet || allowWalletUnsupportedAssets) return filteredAssets

  const isAssetSupported = (asset: Asset) =>
    walletConnectedChainIds.includes(asset.chainId) && isAssetAllowed(asset)

  // An asset on a chain the wallet can't use is swapped for its variants on the ones it can
  return filteredAssets.flatMap(asset => {
    if (walletConnectedChainIds.includes(asset.chainId)) return [asset]
    return getRelatedAssets?.(asset).filter(isAssetSupported) ?? []
  })
}
