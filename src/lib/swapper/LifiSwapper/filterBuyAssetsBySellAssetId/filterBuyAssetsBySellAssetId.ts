import type { Token } from '@lifi/sdk'
import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import { evmChainIds } from '@shapeshiftoss/chain-adapters'
import type { BuyAssetBySellIdInput } from '@shapeshiftoss/swapper'
import { selectAssets } from 'state/slices/selectors'
import { store } from 'state/store'

export function filterBuyAssetsBySellAssetId(
  input: BuyAssetBySellIdInput,
  tokens: Token[],
): AssetId[] {
  const { assetIds = [], sellAssetId } = input

  const assets = selectAssets(store.getState())

  const sellAsset = assets[sellAssetId]

  if (sellAsset === undefined) return []

  const result = assetIds.filter(assetId => {
    const buyAsset = assets[assetId]

    if (buyAsset === undefined) return false

    const { chainReference } = fromAssetId(assetId)

    return (
      buyAsset.chainId !== sellAsset.chainId && // no same-chain swaps
      evmChainIds.includes(buyAsset.chainId as EvmChainId) &&
      evmChainIds.includes(sellAsset.chainId as EvmChainId) &&
      // TODO: dont coerce to number here, instead do a proper lookup
      tokens.some(
        token => token.symbol === buyAsset.symbol && token.chainId === Number(chainReference),
      )
    )
  })

  return result
}
