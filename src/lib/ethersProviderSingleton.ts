import type { ChainId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import { getConfig } from 'config'
import { JsonRpcProvider } from 'ethers'

import { assertUnreachable } from './utils'

export const rpcUrlByChainId = (chainId: EvmChainId): string => {
  switch (chainId) {
    case KnownChainIds.AvalancheMainnet:
      return getConfig().REACT_APP_AVALANCHE_NODE_URL
    case KnownChainIds.OptimismMainnet:
      return getConfig().REACT_APP_OPTIMISM_NODE_URL
    case KnownChainIds.BnbSmartChainMainnet:
      return getConfig().REACT_APP_BNBSMARTCHAIN_NODE_URL
    case KnownChainIds.PolygonMainnet:
      return getConfig().REACT_APP_POLYGON_NODE_URL
    case KnownChainIds.GnosisMainnet:
      return getConfig().REACT_APP_GNOSIS_NODE_URL
    case KnownChainIds.EthereumMainnet:
      return getConfig().REACT_APP_ETHEREUM_NODE_URL
    case KnownChainIds.ArbitrumMainnet:
      return getConfig().REACT_APP_ARBITRUM_NODE_URL
    case KnownChainIds.ArbitrumNovaMainnet:
      return getConfig().REACT_APP_ARBITRUM_NOVA_NODE_URL
    default:
      assertUnreachable(chainId)
  }
}

const ethersProviders: Map<ChainId, JsonRpcProvider> = new Map()

export const getEthersProvider = (
  chainId: EvmChainId = KnownChainIds.EthereumMainnet,
): JsonRpcProvider => {
  if (!ethersProviders.has(chainId)) {
    const provider = new JsonRpcProvider(rpcUrlByChainId(chainId))
    ethersProviders.set(chainId, provider)
    return provider
  } else {
    return ethersProviders.get(chainId)!
  }
}
