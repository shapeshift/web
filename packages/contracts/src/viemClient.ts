import type { ChainId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
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

export const viemEthMainnetClient = createPublicClient({
  chain: mainnet,
  transport: fallback([
    http(process.env.REACT_APP_ETHEREUM_NODE_URL),
    // https://github.com/DefiLlama/chainlist/blob/83b8cc32ee79c10e0281e1799ebe4cd1696082b7/constants/llamaNodesRpcs.js
    http('https://eth.llamarpc.com'),
  ]),
}) as PublicClient

export const viemBscClient = createPublicClient({
  chain: bsc,
  transport: fallback([
    http(process.env.REACT_APP_BNBSMARTCHAIN_NODE_URL),
    // https://github.com/DefiLlama/chainlist/blob/83b8cc32ee79c10e0281e1799ebe4cd1696082b7/constants/llamaNodesRpcs.js#L30
    http('https://binance.llamarpc.com'),
  ]),
}) as PublicClient

export const viemAvalancheClient = createPublicClient({
  chain: avalanche,
  transport: fallback([
    http(process.env.REACT_APP_AVALANCHE_NODE_URL),
    // https://github.com/DefiLlama/chainlist/blob/83b8cc32ee79c10e0281e1799ebe4cd1696082b7/constants/extraRpcs.js#L937
    http('https://api.avax.network/ext/bc/C/rpc'),
  ]),
}) as PublicClient

export const viemArbitrumClient = createPublicClient({
  chain: arbitrum,
  transport: fallback([
    http(process.env.REACT_APP_ARBITRUM_NODE_URL),
    // https://github.com/DefiLlama/chainlist/blob/83b8cc32ee79c10e0281e1799ebe4cd1696082b7/constants/llamaNodesRpcs.js#L63
    http('https://arbitrum.llamarpc.com'),
  ]),
}) as PublicClient

export const viemArbitrumNovaClient = createPublicClient({
  chain: arbitrumNova,
  transport: fallback([
    http(process.env.REACT_APP_ARBITRUM_NOVA_NODE_URL),
    // https://github.com/DefiLlama/chainlist/blob/83b8cc32ee79c10e0281e1799ebe4cd1696082b7/constants/extraRpcs.js#L1393
    http('https://nova.arbitrum.io/rpc'),
  ]),
}) as PublicClient

export const viemOptimismClient = createPublicClient({
  chain: optimism,
  transport: fallback([
    http(process.env.REACT_APP_OPTIMISM_NODE_URL),
    // https://github.com/DefiLlama/chainlist/blob/83b8cc32ee79c10e0281e1799ebe4cd1696082b7/constants/llamaNodesRpcs.js#L41
    http('https://optimism.llamarpc.com'),
  ]),
}) as PublicClient

export const viemGnosisClient = createPublicClient({
  chain: gnosis,
  transport: fallback([
    // https://github.com/DefiLlama/chainlist/blob/83b8cc32ee79c10e0281e1799ebe4cd1696082b7/constants/extraRpcs.js#L1978
    http(process.env.REACT_APP_GNOSIS_NODE_URL),
    http('https://rpc.gnosischain.com'),
  ]),
}) as PublicClient

export const viemPolygonClient = createPublicClient({
  chain: polygon,
  transport: fallback([
    http(process.env.REACT_APP_POLYGON_NODE_URL),
    // https://github.com/DefiLlama/chainlist/blob/83b8cc32ee79c10e0281e1799ebe4cd1696082b7/constants/llamaNodesRpcs.js#L52
    http('https://polygon.llamarpc.com'),
  ]),
}) as PublicClient

export const viemBaseClient = createPublicClient({
  chain: base,
  transport: fallback([
    http(process.env.REACT_APP_BASE_NODE_URL),
    // https://github.com/DefiLlama/chainlist/blob/83b8cc32ee79c10e0281e1799ebe4cd1696082b7/constants/llamaNodesRpcs.js#L19
    http('https://base.llamarpc.com'),
  ]),
}) as PublicClient

export const viemClientByChainId: Record<EvmChainId, PublicClient> = {
  [KnownChainIds.EthereumMainnet]: viemEthMainnetClient,
  [KnownChainIds.BnbSmartChainMainnet]: viemBscClient,
  [KnownChainIds.AvalancheMainnet]: viemAvalancheClient,
  [KnownChainIds.ArbitrumMainnet]: viemArbitrumClient,
  [KnownChainIds.ArbitrumNovaMainnet]: viemArbitrumNovaClient,
  [KnownChainIds.GnosisMainnet]: viemGnosisClient,
  [KnownChainIds.PolygonMainnet]: viemPolygonClient,
  // cast required for these due to typescript shenanigans
  // https://github.com/wagmi-dev/viem/issues/1018
  [KnownChainIds.OptimismMainnet]: viemOptimismClient,
  [KnownChainIds.BaseMainnet]: viemBaseClient,
}

export const viemClientByNetworkId: Record<number, PublicClient> = {
  [mainnet.id]: viemEthMainnetClient,
  [bsc.id]: viemBscClient,
  [avalanche.id]: viemAvalancheClient,
  [arbitrum.id]: viemArbitrumClient,
  [arbitrumNova.id]: viemArbitrumNovaClient,
  [gnosis.id]: viemGnosisClient,
  [polygon.id]: viemPolygonClient,
  // cast required for these due to typescript shenanigans
  // https://github.com/wagmi-dev/viem/issues/1018
  [optimism.id]: viemOptimismClient,
  [base.id]: viemBaseClient,
}

export const assertGetViemClient = (chainId: ChainId): PublicClient => {
  const publicClient = viemClientByChainId[chainId as EvmChainId]
  assert(publicClient !== undefined, `no public client found for chainId '${chainId}'`)
  return publicClient
}
