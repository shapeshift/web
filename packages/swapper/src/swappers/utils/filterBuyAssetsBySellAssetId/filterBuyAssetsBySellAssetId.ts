import { arbitrumNovaChainId, type ChainId } from '@shapeshiftoss/caip'
import { evm } from '@shapeshiftoss/chain-adapters'
import type { Asset } from '@shapeshiftoss/types'

import type { BuyAssetBySellIdInput } from '../../../types'

type ChainIdPredicate = (buyAssetChainId: ChainId, sellAssetChainId: ChainId) => boolean

const _filterEvmBuyAssetsBySellAssetId = (
  { assets, sellAsset }: BuyAssetBySellIdInput,
  chainIdPredicate: ChainIdPredicate,
): Asset[] => {
  // evm only
  if (!evm.isEvmChainId(sellAsset.chainId)) return []

  return assets.filter(buyAsset => {
    // evm only AND chain id predicate with no arbitrum nova support for any swappers
    return (
      evm.isEvmChainId(buyAsset.chainId) &&
      chainIdPredicate(buyAsset.chainId, sellAsset.chainId) &&
      buyAsset.chainId !== arbitrumNovaChainId
    )
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
