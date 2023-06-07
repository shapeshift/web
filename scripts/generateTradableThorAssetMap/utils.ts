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
} from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import type { ThornodePoolResponse } from 'lib/swapper/swappers/ThorchainSwapper/types'

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

export const getSmartContractTokenStandardFromChainId = (
  chainId: ChainId,
): AssetNamespace | undefined => {
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
export const getAssetIdFromPool = (pool: ThornodePoolResponse): AssetId | undefined => {
  const [chain, symbol] = pool.asset.split('.')
  const [, id] = symbol.split('-')
  const chainId = ChainToChainIdMap.get(chain as ThorchainChain)
  const isFeeAsset = chain === symbol || pool.asset === 'GAIA.ATOM'
  console.log('xxx getAssetIdFromPool', { chain, symbol, id, chainId, isFeeAsset })
  if (isFeeAsset) {
    return chainId ? getFeeAssetFromThorchainChain(chain as ThorchainChain) : undefined
  } else {
    // It's a smart contract token
    const assetNamespace = chainId ? getSmartContractTokenStandardFromChainId(chainId) : undefined
    console.log('xxx not fee asset', { assetNamespace, chainId, asset: pool.asset })
    // try {
    //   const assetId =
    //     assetNamespace && chainId
    //       ? toAssetId({ chainId, assetNamespace, assetReference: id })
    //       : undefined
    //   console.log('xxx not fee asset', { assetId, assetNamespace, chainId })
    //   return assetId
    // } catch (error) {
    //   console.error('xxx', error)
    /* toAssetId will throw if it gets a bad assetReference
        As the id comes from an upstream network response, we don't want to throw here
       */
    return undefined
    // }
  }
}
