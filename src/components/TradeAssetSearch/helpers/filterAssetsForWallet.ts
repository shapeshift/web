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
  const isWalletLimited = hasWallet && !allowWalletUnsupportedAssets
  const walletChainIds = new Set(walletConnectedChainIds)
  const isAssetUsable = (asset: Asset) =>
    (!isWalletLimited || walletChainIds.has(asset.chainId)) &&
    (chainIdFilterPredicate?.(asset.chainId) ?? true) &&
    (assetFilterPredicate?.(asset.assetId) ?? true)

  // An asset that can't be used here is swapped for its variants that can
  return assets.flatMap(asset => {
    if (isAssetUsable(asset)) return [asset]
    const supportedVariants = getRelatedAssets?.(asset).filter(isAssetUsable) ?? []
    // The asset's own row lists only the supported variants when grouped
    if (groupVariants && supportedVariants.length > 1) return [asset]
    return supportedVariants
  })
}
