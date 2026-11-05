import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'

export type FilterAssetsForWalletArgs = {
  assets: Asset[]
  hasWallet: boolean
  allowWalletUnsupportedAssets?: boolean
  walletConnectedChainIds: ChainId[]
  assetFilterPredicate?: (assetId: AssetId) => boolean
  getRelatedAssets?: (asset: Asset) => Asset[]
  groupVariants?: boolean
}

export const filterAssetsForWallet = ({
  assets,
  hasWallet,
  allowWalletUnsupportedAssets,
  walletConnectedChainIds,
  assetFilterPredicate,
  getRelatedAssets,
  groupVariants,
}: FilterAssetsForWalletArgs): Asset[] => {
  const isAssetAllowed = (asset: Asset) => assetFilterPredicate?.(asset.assetId) ?? true
  const filteredAssets = assets.filter(isAssetAllowed)

  if (!hasWallet || allowWalletUnsupportedAssets) return filteredAssets

  const isAssetSupported = (asset: Asset) =>
    walletConnectedChainIds.includes(asset.chainId) && isAssetAllowed(asset)

  // An asset on a chain the wallet can't use is swapped for its variants on the ones it can
  return filteredAssets.flatMap(asset => {
    if (walletConnectedChainIds.includes(asset.chainId)) return [asset]
    const supportedVariants = getRelatedAssets?.(asset).filter(isAssetSupported) ?? []
    // The asset's own row lists only the supported variants when grouped
    if (groupVariants && supportedVariants.length > 1) return [asset]
    return supportedVariants
  })
}
