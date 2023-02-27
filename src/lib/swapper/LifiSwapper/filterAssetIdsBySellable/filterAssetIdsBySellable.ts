import type { TokensResponse } from '@lifi/sdk'
import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { evmChainIds } from '@shapeshiftoss/chain-adapters'
import { selectAssets } from 'state/slices/selectors'
import { store } from 'state/store'

export function filterAssetIdsBySellable(
  assetIds: AssetId[],
  tokens: TokensResponse['tokens'],
): AssetId[] {
  const assets = selectAssets(store.getState())
  const result = assetIds.filter(id => {
    const asset = assets[id]

    if (asset === undefined) return false

    const { chainId, symbol } = asset
    const { chainReference } = fromAssetId(id)

    return (
      (evmChainIds as readonly string[]).includes(chainId) &&
      // TODO: dont coerce to number here, instead do a proper lookup
      tokens[Number(chainReference)].some(token => token.symbol === symbol)
    )
  })

  return result
}
