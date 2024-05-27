import type { ChainId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import assert from 'assert'
import { getConfig } from 'config'
import type { Chain, PublicClient, Transport } from 'viem'
import { createPublicClient, http } from 'viem'
import {
  arbitrum,
  arbitrumNova,
  avalanche,
  base,
  bsc,
  gnosis,
  mainnet,
  optimism,
  polygon,
} from 'viem/chains'

export const viemEthMainnetClient = createPublicClient({
  chain: mainnet,
  transport: http(getConfig().REACT_APP_ETHEREUM_NODE_URL),
})

export const viemBscClient = createPublicClient({
  chain: bsc,
  transport: http(getConfig().REACT_APP_BNBSMARTCHAIN_NODE_URL),
})

export const viemAvalancheClient = createPublicClient({
  chain: avalanche,
  transport: http(getConfig().REACT_APP_AVALANCHE_NODE_URL),
})

export const viemArbitrumClient = createPublicClient({
  chain: arbitrum,
  transport: http(getConfig().REACT_APP_ARBITRUM_NODE_URL),
})

export const viemArbitrumNovaClient = createPublicClient({
  chain: arbitrumNova,
  transport: http(getConfig().REACT_APP_ARBITRUM_NOVA_NODE_URL),
})

export const viemOptimismClient = createPublicClient({
  chain: optimism,
  transport: http(getConfig().REACT_APP_OPTIMISM_NODE_URL),
})

export const viemGnosisClient = createPublicClient({
  chain: gnosis,
  transport: http(getConfig().REACT_APP_GNOSIS_NODE_URL),
})

export const viemPolygonClient = createPublicClient({
  chain: polygon,
  transport: http(getConfig().REACT_APP_POLYGON_NODE_URL),
})

export const viemBaseClient = createPublicClient({
  chain: base,
  transport: http(getConfig().REACT_APP_BASE_NODE_URL),
})

export const viemClientByChainId: Record<EvmChainId, PublicClient<Transport, Chain>> = {
  [KnownChainIds.EthereumMainnet]: viemEthMainnetClient,
  [KnownChainIds.BnbSmartChainMainnet]: viemBscClient,
  [KnownChainIds.AvalancheMainnet]: viemAvalancheClient,
  [KnownChainIds.ArbitrumMainnet]: viemArbitrumClient,
  [KnownChainIds.ArbitrumNovaMainnet]: viemArbitrumNovaClient,
  [KnownChainIds.GnosisMainnet]: viemGnosisClient,
  [KnownChainIds.PolygonMainnet]: viemPolygonClient,
  // cast required for these due to typescript shenanigans
  // https://github.com/wagmi-dev/viem/issues/1018
  [KnownChainIds.OptimismMainnet]: viemOptimismClient as PublicClient<Transport, Chain>,
  [KnownChainIds.BaseMainnet]: viemBaseClient as PublicClient<Transport, Chain>,
}

export const viemClientByNetworkId: Record<number, PublicClient<Transport, Chain>> = {
  [mainnet.id]: viemEthMainnetClient,
  [bsc.id]: viemBscClient,
  [avalanche.id]: viemAvalancheClient,
  [arbitrum.id]: viemArbitrumClient,
  [arbitrumNova.id]: viemArbitrumNovaClient,
  [gnosis.id]: viemGnosisClient,
  [polygon.id]: viemPolygonClient,
  // cast required for these due to typescript shenanigans
  // https://github.com/wagmi-dev/viem/issues/1018
  [optimism.id]: viemOptimismClient as PublicClient<Transport, Chain>,
  [base.id]: viemBaseClient as PublicClient<Transport, Chain>,
}

export const assertGetViemClient = (chainId: ChainId): PublicClient<Transport, Chain> => {
  const publicClient = viemClientByChainId[chainId as EvmChainId]
  assert(publicClient !== undefined, `no public client found for chainId '${chainId}'`)
  return publicClient
}
