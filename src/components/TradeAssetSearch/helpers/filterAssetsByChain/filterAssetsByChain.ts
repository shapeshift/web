import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'

export type FilterAssetsByChainArgs = {
  assets: Asset[]
  hasWallet: boolean
  allowWalletUnsupportedAssets?: boolean
  walletConnectedChainIds: ChainId[]
  assetFilterPredicate?: (assetId: AssetId) => boolean
}

export const filterAssetsByChain = ({
  assets,
  hasWallet,
  allowWalletUnsupportedAssets,
  walletConnectedChainIds,
  assetFilterPredicate,
}: FilterAssetsByChainArgs): Asset[] => {
  let filteredAssets = assets.filter(
    (asset: Asset): boolean => assetFilterPredicate?.(asset.assetId) ?? true,
  )

  if (hasWallet && !allowWalletUnsupportedAssets) {
    filteredAssets = filteredAssets.filter((asset: Asset): boolean =>
      walletConnectedChainIds.includes(asset.chainId),
    )
  }

  return filteredAssets
}
