import type { ChainId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { assertUnreachable } from '@shapeshiftoss/utils'
import { JsonRpcProvider } from 'ethers'
import { ethers as ethersV5 } from 'ethers5'

export const rpcUrlByChainId = (chainId: EvmChainId): string => {
  const url = (() => {
    switch (chainId) {
      case KnownChainIds.AvalancheMainnet:
        return process.env.VITE_AVALANCHE_NODE_URL
      case KnownChainIds.OptimismMainnet:
        return process.env.VITE_OPTIMISM_NODE_URL
      case KnownChainIds.BnbSmartChainMainnet:
        return process.env.VITE_BNBSMARTCHAIN_NODE_URL
      case KnownChainIds.PolygonMainnet:
        return process.env.VITE_POLYGON_NODE_URL
      case KnownChainIds.GnosisMainnet:
        return process.env.VITE_GNOSIS_NODE_URL
      case KnownChainIds.EthereumMainnet:
        return process.env.VITE_ETHEREUM_NODE_URL
      case KnownChainIds.ArbitrumMainnet:
        return process.env.VITE_ARBITRUM_NODE_URL
      case KnownChainIds.ArbitrumNovaMainnet:
        return process.env.VITE_ARBITRUM_NOVA_NODE_URL
      case KnownChainIds.BaseMainnet:
        return process.env.VITE_BASE_NODE_URL
      case KnownChainIds.MonadMainnet:
        return process.env.VITE_MONAD_NODE_URL
      case KnownChainIds.HyperEvmMainnet:
        return process.env.VITE_HYPEREVM_NODE_URL
      case KnownChainIds.PlasmaMainnet:
        return process.env.VITE_PLASMA_NODE_URL
      case KnownChainIds.KatanaMainnet:
        return process.env.VITE_KATANA_NODE_URL
      default:
        return assertUnreachable(chainId)
    }
  })()

  if (!url) {
    throw new Error(`No RPC URL found for chainId ${chainId}`)
  }

  return url
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
    // This really should be defined but I guess enough safety never hurts mang...
    const provider = ethersProviders.get(chainId)
    if (!provider) {
      throw new Error(`No provider found for chainId ${chainId}`)
    }

    return provider
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
    // This really should be defined but I guess enough safety never hurts mang...
    const provider = ethersV5Providers.get(chainId)
    if (!provider) {
      throw new Error(`No provider found for chainId ${chainId}`)
    }
    return provider
  }
}
