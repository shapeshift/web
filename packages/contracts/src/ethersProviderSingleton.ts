import type { ChainId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { assertUnreachable } from '@shapeshiftoss/utils'
import { JsonRpcProvider } from 'ethers'
import { ethers as ethersV5 } from 'ethers5'

import { PUBLIC_RPC_URLS } from './publicRpcUrls'

export const rpcUrlByChainId = (chainId: EvmChainId): string => {
  const url = (() => {
    switch (chainId) {
      // First-class chains: env-driven with public fallback
      case KnownChainIds.AvalancheMainnet:
        return process.env.VITE_AVALANCHE_NODE_URL ?? PUBLIC_RPC_URLS.avalanche[0]
      case KnownChainIds.OptimismMainnet:
        return process.env.VITE_OPTIMISM_NODE_URL ?? PUBLIC_RPC_URLS.optimism[0]
      case KnownChainIds.BnbSmartChainMainnet:
        return process.env.VITE_BNBSMARTCHAIN_NODE_URL ?? PUBLIC_RPC_URLS.bsc[0]
      case KnownChainIds.PolygonMainnet:
        return process.env.VITE_POLYGON_NODE_URL ?? PUBLIC_RPC_URLS.polygon[0]
      case KnownChainIds.GnosisMainnet:
        return process.env.VITE_GNOSIS_NODE_URL ?? PUBLIC_RPC_URLS.gnosis[0]
      case KnownChainIds.EthereumMainnet:
        return process.env.VITE_ETHEREUM_NODE_URL ?? PUBLIC_RPC_URLS.ethereum[0]
      case KnownChainIds.ArbitrumMainnet:
        return process.env.VITE_ARBITRUM_NODE_URL ?? PUBLIC_RPC_URLS.arbitrum[0]
      case KnownChainIds.BaseMainnet:
        return process.env.VITE_BASE_NODE_URL ?? PUBLIC_RPC_URLS.base[0]
      // Second-class chains: fallback-only
      case KnownChainIds.MonadMainnet:
        return PUBLIC_RPC_URLS.monad[0]
      case KnownChainIds.HyperEvmMainnet:
        return PUBLIC_RPC_URLS.hyperEvm[0]
      case KnownChainIds.PlasmaMainnet:
        return PUBLIC_RPC_URLS.plasma[0]
      case KnownChainIds.MantleMainnet:
        return PUBLIC_RPC_URLS.mantle[0]
      case KnownChainIds.InkMainnet:
        return PUBLIC_RPC_URLS.ink[0]
      case KnownChainIds.MegaEthMainnet:
        return PUBLIC_RPC_URLS.megaEth[0]
      case KnownChainIds.BerachainMainnet:
        return PUBLIC_RPC_URLS.berachain[0]
      case KnownChainIds.CronosMainnet:
        return PUBLIC_RPC_URLS.cronos[0]
      case KnownChainIds.KatanaMainnet:
        return PUBLIC_RPC_URLS.katana[0]
      case KnownChainIds.EtherealMainnet:
        return PUBLIC_RPC_URLS.ethereal[0]
      case KnownChainIds.FlowEvmMainnet:
        return PUBLIC_RPC_URLS.flowEvm[0]
      case KnownChainIds.CeloMainnet:
        return PUBLIC_RPC_URLS.celo[0]
      case KnownChainIds.PlumeMainnet:
        return PUBLIC_RPC_URLS.plume[0]
      case KnownChainIds.StoryMainnet:
        return PUBLIC_RPC_URLS.story[0]
      case KnownChainIds.ZkSyncEraMainnet:
        return PUBLIC_RPC_URLS.zkSyncEra[0]
      case KnownChainIds.BlastMainnet:
        return PUBLIC_RPC_URLS.blast[0]
      case KnownChainIds.WorldChainMainnet:
        return PUBLIC_RPC_URLS.worldChain[0]
      case KnownChainIds.HemiMainnet:
        return PUBLIC_RPC_URLS.hemi[0]
      case KnownChainIds.LineaMainnet:
        return PUBLIC_RPC_URLS.linea[0]
      case KnownChainIds.ScrollMainnet:
        return PUBLIC_RPC_URLS.scroll[0]
      case KnownChainIds.SonicMainnet:
        return PUBLIC_RPC_URLS.sonic[0]
      case KnownChainIds.UnichainMainnet:
        return PUBLIC_RPC_URLS.unichain[0]
      case KnownChainIds.BobMainnet:
        return PUBLIC_RPC_URLS.bob[0]
      case KnownChainIds.ModeMainnet:
        return PUBLIC_RPC_URLS.mode[0]
      case KnownChainIds.SoneiumMainnet:
        return PUBLIC_RPC_URLS.soneium[0]
      case KnownChainIds.SeiMainnet:
        return PUBLIC_RPC_URLS.sei[0]
      case KnownChainIds.AbstractMainnet:
        return PUBLIC_RPC_URLS.abstract[0]
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
