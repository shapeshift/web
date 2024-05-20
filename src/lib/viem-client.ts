import type { ChainId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import assert from 'assert'
import { getConfig } from 'config'
import type { PublicClient } from 'viem'
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

export const viemClientByChainId: Record<EvmChainId, PublicClient> = {
  [KnownChainIds.EthereumMainnet]: viemEthMainnetClient,
  [KnownChainIds.BnbSmartChainMainnet]: viemBscClient,
  [KnownChainIds.AvalancheMainnet]: viemAvalancheClient,
  [KnownChainIds.ArbitrumMainnet]: viemArbitrumClient,
  [KnownChainIds.ArbitrumNovaMainnet]: viemArbitrumNovaClient,
  [KnownChainIds.GnosisMainnet]: viemGnosisClient,
  [KnownChainIds.PolygonMainnet]: viemPolygonClient,
  // cast required due to typescript shenanigans
  // https://github.com/wagmi-dev/viem/issues/1018
  [KnownChainIds.OptimismMainnet]: viemOptimismClient as PublicClient,
  [KnownChainIds.BaseMainnet]: viemBaseClient as PublicClient,
}

export const assertGetViemClient = (chainId: ChainId): PublicClient => {
  const publicClient = viemClientByChainId[chainId as EvmChainId]
  assert(publicClient !== undefined, `no public client found for chainId '${chainId}'`)
  return publicClient
}
