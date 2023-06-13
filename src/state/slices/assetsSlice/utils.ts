import type {
  AssetId,
  AssetReference,
  ChainId,
  ChainNamespace,
  ChainReference,
} from '@shapeshiftoss/caip'
import {
  ASSET_REFERENCE,
  CHAIN_NAMESPACE,
  CHAIN_REFERENCE,
  fromAssetId,
  fromChainId,
  isNft,
  toAssetId,
} from '@shapeshiftoss/caip'
import type { Transaction } from '@shapeshiftoss/chain-adapters'
import type { Asset } from 'lib/asset-service'

import type { AssetsById, AssetsState } from './assetsSlice'
import { makeAsset } from './assetsSlice'

export const chainIdFeeAssetReferenceMap = (
  chainNamespace: ChainNamespace,
  chainReference: ChainReference,
): AssetReference => {
  return (() => {
    switch (chainNamespace) {
      case CHAIN_NAMESPACE.Utxo:
        switch (chainReference) {
          case CHAIN_REFERENCE.BitcoinMainnet:
            return ASSET_REFERENCE.Bitcoin
          case CHAIN_REFERENCE.BitcoinCashMainnet:
            return ASSET_REFERENCE.BitcoinCash
          case CHAIN_REFERENCE.DogecoinMainnet:
            return ASSET_REFERENCE.Dogecoin
          case CHAIN_REFERENCE.LitecoinMainnet:
            return ASSET_REFERENCE.Litecoin
          default:
            throw new Error(`Chain namespace ${chainNamespace} on ${chainReference} not supported.`)
        }
      case CHAIN_NAMESPACE.Evm:
        switch (chainReference) {
          case CHAIN_REFERENCE.AvalancheCChain:
            return ASSET_REFERENCE.AvalancheC
          case CHAIN_REFERENCE.EthereumMainnet:
            return ASSET_REFERENCE.Ethereum
          case CHAIN_REFERENCE.OptimismMainnet:
            return ASSET_REFERENCE.Optimism
          case CHAIN_REFERENCE.BnbSmartChainMainnet:
            return ASSET_REFERENCE.BnbSmartChain
          case CHAIN_REFERENCE.PolygonMainnet:
            return ASSET_REFERENCE.Polygon
          case CHAIN_REFERENCE.GnosisMainnet:
            return ASSET_REFERENCE.Gnosis
          default:
            throw new Error(`Chain namespace ${chainNamespace} on ${chainReference} not supported.`)
        }
      case CHAIN_NAMESPACE.CosmosSdk:
        switch (chainReference) {
          case CHAIN_REFERENCE.CosmosHubMainnet:
            return ASSET_REFERENCE.Cosmos
          case CHAIN_REFERENCE.OsmosisMainnet:
            return ASSET_REFERENCE.Osmosis
          case CHAIN_REFERENCE.ThorchainMainnet:
            return ASSET_REFERENCE.Thorchain
          default:
            throw new Error(`Chain namespace ${chainNamespace} on ${chainReference} not supported.`)
        }
      default:
        throw new Error(`Chain namespace ${chainNamespace} on ${chainReference} not supported.`)
    }
  })()
}

type GetFeeAssetByChainId = (
  assetsById: AssetsById,
  chainId: ChainId | undefined,
) => Asset | undefined

type GetFeeAssetByAssetId = (
  assetsById: AssetsById,
  assetId: AssetId | undefined,
) => Asset | undefined

export const getFeeAssetByChainId: GetFeeAssetByChainId = (assetsById, chainId) => {
  if (!chainId) return undefined
  const { chainNamespace, chainReference } = fromChainId(chainId)
  const feeAssetId = toAssetId({
    chainId,
    assetNamespace: 'slip44',
    assetReference: chainIdFeeAssetReferenceMap(chainNamespace, chainReference),
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
    assetReference: chainIdFeeAssetReferenceMap(chainNamespace, chainReference),
  })
  return assetsById[feeAssetId]
}

export const makeNftAssetsFromTxs = (txs: Transaction[]): AssetsState => {
  return txs.reduce<AssetsState>(
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

        state.byId[transfer.assetId] = makeAsset({
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
