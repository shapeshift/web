import type { ChainId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import assert from 'assert'
import type { PublicClient } from 'viem'
import { createPublicClient, fallback, http } from 'viem'
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

const env = import.meta.env ?? process.env

export const viemEthMainnetClient = createPublicClient({
  chain: mainnet,
  transport: fallback(
    [env.VITE_ETHEREUM_NODE_URL, 'https://eth.llamarpc.com'].filter(Boolean).map(url => http(url)),
  ),
}) as PublicClient

export const viemBscClient = createPublicClient({
  chain: bsc,
  transport: fallback(
    // https://github.com/DefiLlama/chainlist/blob/83b8cc32ee79c10e0281e1799ebe4cd1696082b7/constants/llamaNodesRpcs.js#L30
    [env.VITE_BNBSMARTCHAIN_NODE_URL, 'https://binance.llamarpc.com']
      .filter(Boolean)
      .map(url => http(url)),
  ),
}) as PublicClient

export const viemAvalancheClient = createPublicClient({
  chain: avalanche,
  transport: fallback([env.VITE_AVALANCHE_NODE_URL].filter(Boolean).map(url => http(url))),
}) as PublicClient

export const viemArbitrumClient = createPublicClient({
  chain: arbitrum,
  transport: fallback([env.VITE_ARBITRUM_NODE_URL].filter(Boolean).map(url => http(url))),
}) as PublicClient

export const viemArbitrumNovaClient = createPublicClient({
  chain: arbitrumNova,
  transport: fallback([env.VITE_ARBITRUM_NOVA_NODE_URL].filter(Boolean).map(url => http(url))),
}) as PublicClient

export const viemOptimismClient = createPublicClient({
  chain: optimism,
  transport: fallback([env.VITE_OPTIMISM_NODE_URL].filter(Boolean).map(url => http(url))),
}) as PublicClient

export const viemGnosisClient = createPublicClient({
  chain: gnosis,
  transport: fallback([env.VITE_GNOSIS_NODE_URL].filter(Boolean).map(url => http(url))),
}) as PublicClient

export const viemPolygonClient = createPublicClient({
  chain: polygon,
  transport: fallback([env.VITE_POLYGON_NODE_URL].filter(Boolean).map(url => http(url))),
}) as PublicClient

export const viemBaseClient = createPublicClient({
  chain: base,
  transport: fallback(
    // https://github.com/DefiLlama/chainlist/blob/83b8cc32ee79c10e0281e1799ebe4cd1696082b7/constants/llamaNodesRpcs.js#L19
    [env.VITE_BASE_NODE_URL, 'https://base.llamarpc.com'].filter(Boolean).map(url => http(url)),
  ),
}) as PublicClient

export const viemClientByChainId: Record<ChainId, PublicClient> = {
  [KnownChainIds.EthereumMainnet]: viemEthMainnetClient,
  [KnownChainIds.BnbSmartChainMainnet]: viemBscClient,
  [KnownChainIds.AvalancheMainnet]: viemAvalancheClient,
  [KnownChainIds.ArbitrumMainnet]: viemArbitrumClient,
  [KnownChainIds.ArbitrumNovaMainnet]: viemArbitrumNovaClient,
  [KnownChainIds.GnosisMainnet]: viemGnosisClient,
  [KnownChainIds.PolygonMainnet]: viemPolygonClient,
  [KnownChainIds.OptimismMainnet]: viemOptimismClient,
  [KnownChainIds.BaseMainnet]: viemBaseClient,
}

export const viemNetworkIdByChainId: Record<ChainId, number> = {
  [KnownChainIds.EthereumMainnet]: mainnet.id,
  [KnownChainIds.BnbSmartChainMainnet]: bsc.id,
  [KnownChainIds.AvalancheMainnet]: avalanche.id,
  [KnownChainIds.ArbitrumMainnet]: arbitrum.id,
  [KnownChainIds.ArbitrumNovaMainnet]: arbitrumNova.id,
  [KnownChainIds.GnosisMainnet]: gnosis.id,
  [KnownChainIds.PolygonMainnet]: polygon.id,
  [KnownChainIds.OptimismMainnet]: optimism.id,
  [KnownChainIds.BaseMainnet]: base.id,
}

export const viemClientByNetworkId: Record<number, PublicClient> = {
  [mainnet.id]: viemEthMainnetClient,
  [bsc.id]: viemBscClient,
  [avalanche.id]: viemAvalancheClient,
  [arbitrum.id]: viemArbitrumClient,
  [arbitrumNova.id]: viemArbitrumNovaClient,
  [gnosis.id]: viemGnosisClient,
  [polygon.id]: viemPolygonClient,
  [optimism.id]: viemOptimismClient,
  [base.id]: viemBaseClient,
}

export const assertGetViemClient = (chainId: ChainId): PublicClient => {
  const publicClient = viemClientByChainId[chainId]
  assert(publicClient !== undefined, `no public client found for chainId '${chainId}'`)
  return publicClient
}
