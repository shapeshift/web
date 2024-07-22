import type { ChainId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import { getConfig } from 'config'
import { JsonRpcProvider } from 'ethers'
import { ethers as ethersV5 } from 'ethers5'

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
    case KnownChainIds.BaseMainnet:
      return getConfig().REACT_APP_BASE_NODE_URL
    default:
      assertUnreachable(chainId)
  }
}

const ethersProviders: Map<ChainId, JsonRpcProvider> = new Map()
const ethersV5Providers: Map<ChainId, ethersV5.providers.StaticJsonRpcProvider> = new Map()

export const getEthersProvider = (chainId: EvmChainId): JsonRpcProvider => {
  if (!ethersProviders.has(chainId)) {
    const provider = new JsonRpcProvider(rpcUrlByChainId(chainId), undefined, {
      staticNetwork: true,
    })
    ethersProviders.set(chainId, provider)
    return provider
  } else {
    return ethersProviders.get(chainId)!
  }
}

// For backwards-compatibility for libraries still stuck in v5
export const getEthersV5Provider = (
  chainId: EvmChainId = KnownChainIds.EthereumMainnet,
): ethersV5.providers.JsonRpcProvider => {
  if (!ethersV5Providers.has(chainId)) {
    const provider = new ethersV5.providers.StaticJsonRpcProvider(rpcUrlByChainId(chainId))
    ethersV5Providers.set(chainId, provider)
    return provider
  } else {
    return ethersV5Providers.get(chainId)!
  }
}
