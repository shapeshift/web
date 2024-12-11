import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromAssetId, fromChainId, isNft, toAssetId } from '@shapeshiftoss/caip'
import type { Transaction } from '@shapeshiftoss/chain-adapters'
import type { Asset, AssetsByIdPartial } from '@shapeshiftoss/types'
import { getNativeFeeAssetReference, makeAsset } from '@shapeshiftoss/utils'

import type { UpsertAssetsPayload } from './assetsSlice'

type GetFeeAssetByChainId = (
  assetsById: AssetsByIdPartial,
  chainId: ChainId | undefined,
) => Asset | undefined

type GetFeeAssetByAssetId = (
  assetsById: AssetsByIdPartial,
  assetId: AssetId | undefined,
) => Asset | undefined

export const getFeeAssetByChainId: GetFeeAssetByChainId = (assetsById, chainId) => {
  if (!chainId) return undefined
  const { chainNamespace, chainReference } = fromChainId(chainId)
  const feeAssetId = toAssetId({
    chainId,
    assetNamespace: 'slip44',
    assetReference: getNativeFeeAssetReference(chainNamespace, chainReference),
  })
  return assetsById[feeAssetId]
}

export const getFeeAssetByAssetId: GetFeeAssetByAssetId = (assetsById, assetId) => {
  if (!assetId) return undefined
  const { chainNamespace, chainReference } = fromAssetId(assetId)
  const feeAssetId = toAssetId({
    chainNamespace,
    chainReference,
    assetNamespace: 'slip44',
    assetReference: getNativeFeeAssetReference(chainNamespace, chainReference),
  })
  return assetsById[feeAssetId]
}

export const makeNftAssetsFromTxs = (txs: Transaction[]): UpsertAssetsPayload => {
  return txs.reduce<UpsertAssetsPayload>(
    (state, tx) => {
      if (fromChainId(tx.chainId).chainNamespace !== CHAIN_NAMESPACE.Evm) return state

      tx.transfers.forEach(transfer => {
        if (state.byId[transfer.assetId] || !isNft(transfer.assetId)) return

        const icon = (() => {
          if (!tx.data || !transfer.id || !('mediaById' in tx.data)) return
          const url = tx.data.mediaById[transfer.id]?.url
          if (!url) return
          if (url.startsWith('ipfs://'))
            return url.replace('ipfs://', 'https://gateway.shapeshift.com/ipfs/')
          return url
        })()

        state.byId[transfer.assetId] = makeAsset(state.byId, {
          assetId: transfer.assetId,
          id: transfer.id,
          symbol: transfer.token?.symbol ?? 'N/A',
          name: transfer.token?.name ?? 'Unknown',
          precision: 0,
          icon,
        })

        state.ids.push(transfer.assetId)
      })

      return state
    },
    { byId: {}, ids: [] },
  )
}
