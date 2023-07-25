import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { BuyAssetBySellIdInput } from 'lib/swapper/api'
import { selectAssets } from 'state/slices/selectors'
import { store } from 'state/store'

type ChainIdPredicate = (buyAssetChainId: ChainId, sellAssetChainId: ChainId) => boolean

const _filterEvmBuyAssetsBySellAssetId = (
  input: BuyAssetBySellIdInput,
  chainIdPredicate: ChainIdPredicate,
): AssetId[] => {
  const { nonNftAssetIds = [], sellAssetId } = input

  const assets = selectAssets(store.getState())
  const sellAsset = assets[sellAssetId]

  // evm only
  if (sellAsset === undefined || !isEvmChainId(sellAsset.chainId)) return []

  return nonNftAssetIds.filter(buyAssetId => {
    const buyAsset = assets[buyAssetId]

    if (buyAsset === undefined) return false

    // evm only AND chain id predicate
    return isEvmChainId(buyAsset.chainId) && chainIdPredicate(buyAsset.chainId, sellAsset.chainId)
  })
}

export const filterSameChainEvmBuyAssetsBySellAssetId = (
  input: BuyAssetBySellIdInput,
): AssetId[] => {
  const sameChainIdPredicate = (buyAssetChainId: ChainId, sellAssetChainId: ChainId): boolean =>
    buyAssetChainId === sellAssetChainId
  return _filterEvmBuyAssetsBySellAssetId(input, sameChainIdPredicate)
}

export const filterCrossChainEvmBuyAssetsBySellAssetId = (
  input: BuyAssetBySellIdInput,
): AssetId[] => {
  const crossChainIdPredicate = (buyAssetChainId: ChainId, sellAssetChainId: ChainId): boolean =>
    buyAssetChainId !== sellAssetChainId
  return _filterEvmBuyAssetsBySellAssetId(input, crossChainIdPredicate)
}
