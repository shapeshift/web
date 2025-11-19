import type { AssetId, AssetNamespace, ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  ASSET_NAMESPACE,
  avalancheChainId,
  baseChainId,
  bchChainId,
  binanceChainId,
  bscChainId,
  btcChainId,
  cosmosChainId,
  dogeChainId,
  ethChainId,
  ltcChainId,
  thorchainChainId,
  toAssetId,
} from '@shapeshiftoss/caip'
import type { ThornodePoolResponse } from '@shapeshiftoss/swapper'
import { KnownChainIds } from '@shapeshiftoss/types'
import { chainIdToFeeAssetId } from '@shapeshiftoss/utils'

import type { AssetIdPair } from './types'

enum Chain {
  ARB = 'ARB',
  AVAX = 'AVAX',
  BASE = 'BASE',
  BCH = 'BCH',
  BNB = 'BNB',
  BSC = 'BSC',
  BTC = 'BTC',
  DOGE = 'DOGE',
  ETH = 'ETH',
  GAIA = 'GAIA',
  LTC = 'LTC',
  THOR = 'THOR',
}

const chainToChainId: Record<Chain, ChainId> = {
  [Chain.ARB]: arbitrumChainId,
  [Chain.AVAX]: avalancheChainId,
  [Chain.BASE]: baseChainId,
  [Chain.BCH]: bchChainId,
  [Chain.BNB]: binanceChainId,
  [Chain.BSC]: bscChainId,
  [Chain.BTC]: btcChainId,
  [Chain.DOGE]: dogeChainId,
  [Chain.ETH]: ethChainId,
  [Chain.GAIA]: cosmosChainId,
  [Chain.LTC]: ltcChainId,
  [Chain.THOR]: thorchainChainId,
}

const getFeeAssetFromChain = (chain: Chain): AssetId => {
  return chainIdToFeeAssetId(chainToChainId[chain])
}

const getTokenStandardFromChainId = (chainId: ChainId): AssetNamespace | undefined => {
  switch (chainId) {
    case KnownChainIds.ArbitrumMainnet:
    case KnownChainIds.AvalancheMainnet:
    case KnownChainIds.BaseMainnet:
    case KnownChainIds.EthereumMainnet:
    case KnownChainIds.GnosisMainnet:
    case KnownChainIds.PolygonMainnet:
    case KnownChainIds.BnbSmartChainMainnet:
      return ASSET_NAMESPACE.erc20
    default:
      return undefined
  }
}

/*
  Converts a ThorchainPoolResponse to an AssetId using THORChain asset notation: https://dev.thorchain.org/thorchain-dev/concepts/memos#asset-notation
  E.g. "ETH.USDT-0xdac17f958d2ee523a2206206994597c13d831ec7" returns "eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7"
 */
export const getAssetIdPairFromPool = (pool: ThornodePoolResponse): AssetIdPair | undefined => {
  try {
    const [chain, symbol = ''] = pool.asset.split('.') as [Chain, string]
    const [, assetReference = ''] = symbol.split('-')

    const chainId = chainToChainId[chain]

    if (!chainId) {
      console.error(`no chainId for chain: ${chain}`)
      return
    }

    if (!assetReference) {
      const assetId = getFeeAssetFromChain(chain)

      return [pool.asset, assetId]
    } else {
      const assetNamespace = getTokenStandardFromChainId(chainId)

      if (!assetNamespace) throw new Error(`no assetNamespace for chainId: ${chainId}`)

      const assetId = toAssetId({
        chainId,
        assetNamespace,
        assetReference: assetReference.toLowerCase(),
      })

      return [pool.asset, assetId]
    }
  } catch (err) {
    console.error(`Could not parse ${pool.asset}`, err)
  }
}
