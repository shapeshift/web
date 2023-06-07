import type { AssetId, AssetNamespace, ChainId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, toAssetId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import type { ThornodePoolResponse } from 'lib/swapper/swappers/ThorchainSwapper/types'

import type { ThorchainChain } from '.'
import { ChainToChainIdMap } from '.'

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
  const isFeeAsset = chain === symbol
  console.log('xxx getAssetIdFromPool', { chain, symbol, id, chainId, isFeeAsset })
  if (isFeeAsset) {
    // fixme
    return undefined
  } else {
    // It's an EVM smart contract token
    const assetNamespace = chainId ? getSmartContractTokenStandardFromChainId(chainId) : undefined
    try {
      const assetId =
        assetNamespace && chainId
          ? toAssetId({ chainId, assetNamespace, assetReference: id })
          : undefined
      return assetId
    } catch (error) {
      console.error('xxx', error)
      /* toAssetId will throw if it gets a bad assetReference
        As the id comes from an upstream network response, we don't want to throw here
       */
      return undefined
    }
  }
}
