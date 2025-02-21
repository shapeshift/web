import type { ChainId } from '@shapeshiftmonorepo/caip'
import { arbitrumNovaChainId } from '@shapeshiftmonorepo/caip'
import { isEvmChainId } from '@shapeshiftmonorepo/chain-adapters'
import type { Asset } from '@shapeshiftmonorepo/types'

import type { BuyAssetBySellIdInput } from '../../../types'

type ChainIdPredicate = (buyAssetChainId: ChainId, sellAssetChainId: ChainId) => boolean

const _filterEvmBuyAssetsBySellAssetId = (
  { assets, sellAsset }: BuyAssetBySellIdInput,
  chainIdPredicate: ChainIdPredicate,
): Asset[] => {
  // evm only
  if (!isEvmChainId(sellAsset.chainId)) return []

  return assets.filter(buyAsset => {
    // evm only AND chain id predicate with no arbitrum nova support for any swappers
    return (
      isEvmChainId(buyAsset.chainId) &&
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
