import type { TokensResponse } from '@lifi/sdk'
import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { evmChainIds } from '@shapeshiftoss/chain-adapters'
import type { BuyAssetBySellIdInput } from '@shapeshiftoss/swapper'
import { selectAssets } from 'state/slices/selectors'
import { store } from 'state/store'

export function filterBuyAssetsBySellAssetId(
  input: BuyAssetBySellIdInput,
  tokens: TokensResponse['tokens'],
): AssetId[] {
  const { assetIds = [], sellAssetId } = input

  const assets = selectAssets(store.getState())

  const sellAsset = assets[sellAssetId]

  if (sellAsset === undefined) return []

  const result = assetIds.filter(id => {
    const buyAsset = assets[id]

    if (buyAsset === undefined) return false

    const { chainReference } = fromAssetId(id)

    return (
      buyAsset.chainId !== sellAsset.chainId && // no same-chain swaps
      (evmChainIds as readonly string[]).includes(buyAsset.chainId) &&
      (evmChainIds as readonly string[]).includes(sellAsset.chainId) &&
      // TODO: dont coerce to number here, instead do a proper lookup
      tokens[Number(chainReference)].some(token => token.symbol === buyAsset.symbol)
    )
  })

  return result
}
