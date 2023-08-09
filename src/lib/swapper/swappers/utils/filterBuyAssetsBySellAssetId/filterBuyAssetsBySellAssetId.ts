import type { ChainId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { Asset } from 'lib/asset-service'
import type { BuyAssetBySellIdInput } from 'lib/swapper/api'

type ChainIdPredicate = (buyAssetChainId: ChainId, sellAssetChainId: ChainId) => boolean

const _filterEvmBuyAssetsBySellAssetId = (
  { assets, sellAsset }: BuyAssetBySellIdInput,
  chainIdPredicate: ChainIdPredicate,
): Asset[] => {
  // evm only
  if (!isEvmChainId(sellAsset.chainId)) return []

  return assets.filter(buyAsset => {
    // evm only AND chain id predicate
    return isEvmChainId(buyAsset.chainId) && chainIdPredicate(buyAsset.chainId, sellAsset.chainId)
  })
}

export const filterSameChainEvmBuyAssetsBySellAssetId = (input: BuyAssetBySellIdInput): Asset[] => {
  const sameChainIdPredicate = (buyAssetChainId: ChainId, sellAssetChainId: ChainId): boolean =>
    buyAssetChainId === sellAssetChainId
  return _filterEvmBuyAssetsBySellAssetId(input, sameChainIdPredicate)
}

export const filterCrossChainEvmBuyAssetsBySellAssetId = (
  input: BuyAssetBySellIdInput,
): Asset[] => {
  const crossChainIdPredicate = (buyAssetChainId: ChainId, sellAssetChainId: ChainId): boolean =>
    buyAssetChainId !== sellAssetChainId
  return _filterEvmBuyAssetsBySellAssetId(input, crossChainIdPredicate)
}
