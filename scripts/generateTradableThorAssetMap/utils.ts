import type { AssetId, AssetNamespace, ChainId } from '@shapeshiftoss/caip'
import {
  ASSET_NAMESPACE,
  avalancheAssetId,
  bchAssetId,
  binanceAssetId,
  btcAssetId,
  cosmosAssetId,
  dogeAssetId,
  ethAssetId,
  ltcAssetId,
  thorchainAssetId,
  toAssetId,
} from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import { getAddress, isAddress } from 'viem'
import type { ThornodePoolResponse } from 'lib/swapper/swappers/ThorchainSwapper/types'

import type { AssetIdPair } from '.'
import { ChainToChainIdMap, ThorchainChain } from '.'

export const getFeeAssetFromThorchainChain = (chain: ThorchainChain): AssetId | undefined => {
  switch (chain) {
    case ThorchainChain.BTC:
      return btcAssetId
    case ThorchainChain.DOGE:
      return dogeAssetId
    case ThorchainChain.LTC:
      return ltcAssetId
    case ThorchainChain.BCH:
      return bchAssetId
    case ThorchainChain.ETH:
      return ethAssetId
    case ThorchainChain.AVAX:
      return avalancheAssetId
    case ThorchainChain.BNB:
      return binanceAssetId
    case ThorchainChain.THOR:
      return thorchainAssetId
    case ThorchainChain.GAIA:
      return cosmosAssetId
    default:
      return undefined
  }
}

export const getTokenStandardFromChainId = (chainId: ChainId): AssetNamespace | undefined => {
  switch (chainId) {
    case KnownChainIds.EthereumMainnet:
    case KnownChainIds.AvalancheMainnet:
    case KnownChainIds.PolygonMainnet:
    case KnownChainIds.GnosisMainnet:
      return ASSET_NAMESPACE.erc20
    case KnownChainIds.BnbSmartChainMainnet:
      return ASSET_NAMESPACE.bep20
    case KnownChainIds.OsmosisMainnet:
      return ASSET_NAMESPACE.ibc
    default:
      return undefined
  }
}

/*
  Converts a ThorchainPoolResponse to an AssetId using THORChain asset notation: https://dev.thorchain.org/thorchain-dev/concepts/memos#asset-notation
  E.g. "ETH.USDT-0xdac17f958d2ee523a2206206994597c13d831ec7" returns "eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7"
 */
export const getAssetIdPairFromPool = (pool: ThornodePoolResponse): AssetIdPair | undefined => {
  const thorchainAsset = pool.asset
  const [chain, symbol] = thorchainAsset.split('.')
  const [, id] = symbol.split('-')
  const chainId = ChainToChainIdMap.get(chain as ThorchainChain)
  const isFeeAsset = chain === symbol || thorchainAsset === 'GAIA.ATOM'
  if (isFeeAsset) {
    const assetId = chainId ? getFeeAssetFromThorchainChain(chain as ThorchainChain) : undefined
    if (assetId) {
      return [thorchainAsset, assetId]
    } else {
      console.error(`Could not parse ${thorchainAsset}`)
    }
  } else {
    // It's a smart contract token
    const assetNamespace = chainId ? getTokenStandardFromChainId(chainId) : undefined
    try {
      const uncheckedAddress = (id ?? '').toLowerCase()
      const maybeChecksummedAddress = isAddress(uncheckedAddress)
        ? getAddress(uncheckedAddress)
        : undefined
      if (assetNamespace && chainId && maybeChecksummedAddress) {
        try {
          const assetId = toAssetId({
            chainId,
            assetNamespace,
            assetReference: maybeChecksummedAddress,
          })
          return [thorchainAsset, assetId]
        } catch (error) {
          console.error(`Could not parse ${thorchainAsset}`, error)
        }
      } else {
        console.error(`Could not parse ${thorchainAsset}`)
      }
    } catch (error) {
      console.error(`Could not parse ${thorchainAsset}`, error)
    }
  }
}
