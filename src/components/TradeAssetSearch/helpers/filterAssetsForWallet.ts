import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'

export type FilterAssetsForWalletArgs = {
  assets: Asset[]
  hasWallet: boolean
  allowWalletUnsupportedAssets?: boolean
  walletConnectedChainIds: ChainId[]
  assetFilterPredicate?: (assetId: AssetId) => boolean
}

export const filterAssetsForWallet = ({
  assets,
  hasWallet,
  allowWalletUnsupportedAssets,
  walletConnectedChainIds,
  assetFilterPredicate,
}: FilterAssetsForWalletArgs): Asset[] => {
  const filteredAssets = assets.filter(asset => assetFilterPredicate?.(asset.assetId) ?? true)

  if (!hasWallet || allowWalletUnsupportedAssets) return filteredAssets

  return filteredAssets.filter(asset => walletConnectedChainIds.includes(asset.chainId))
}
