import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'

export type FilterAssetsForWalletArgs = {
  assets: Asset[]
  hasWallet: boolean
  allowWalletUnsupportedAssets?: boolean
  walletConnectedChainIds: ChainId[]
  assetFilterPredicate?: (assetId: AssetId) => boolean
  chainIdFilterPredicate?: (chainId: ChainId) => boolean
  getRelatedAssets?: (asset: Asset) => Asset[]
  groupVariants?: boolean
}

export const filterAssetsForWallet = ({
  assets,
  hasWallet,
  allowWalletUnsupportedAssets,
  walletConnectedChainIds,
  assetFilterPredicate,
  chainIdFilterPredicate,
  getRelatedAssets,
  groupVariants,
}: FilterAssetsForWalletArgs): Asset[] => {
  const isAssetAllowed = (asset: Asset) => assetFilterPredicate?.(asset.assetId) ?? true

  if (!hasWallet || allowWalletUnsupportedAssets) return assets.filter(isAssetAllowed)

  const walletChainIds = new Set(walletConnectedChainIds)
  const isAssetUsable = (asset: Asset) =>
    walletChainIds.has(asset.chainId) &&
    (chainIdFilterPredicate?.(asset.chainId) ?? true) &&
    isAssetAllowed(asset)

  // An asset the wallet can't use here is swapped for its variants that it can
  return assets.flatMap(asset => {
    if (isAssetUsable(asset)) return [asset]
    const supportedVariants = getRelatedAssets?.(asset).filter(isAssetUsable) ?? []
    // The asset's own row lists only the supported variants when grouped
    if (groupVariants && supportedVariants.length > 1) return [asset]
    return supportedVariants
  })
}
