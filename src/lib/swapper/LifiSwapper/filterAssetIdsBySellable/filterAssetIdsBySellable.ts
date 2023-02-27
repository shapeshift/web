import type { Token } from '@lifi/sdk'
import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import { evmChainIds } from '@shapeshiftoss/chain-adapters'
import { selectAssets } from 'state/slices/selectors'
import { store } from 'state/store'

export function filterAssetIdsBySellable(assetIds: AssetId[], tokens: Token[]): AssetId[] {
  const assets = selectAssets(store.getState())
  const result = assetIds.filter(assetId => {
    const asset = assets[assetId]

    if (asset === undefined) return false

    const { chainId, symbol } = asset
    const { chainReference } = fromAssetId(assetId)

    return (
      evmChainIds.includes(chainId as EvmChainId) &&
      // TODO: dont coerce to number here, instead do a proper lookup
      tokens.some(token => token.symbol === symbol && token.chainId === Number(chainReference))
    )
  })

  return result
}
