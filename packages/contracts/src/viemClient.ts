import type { ChainId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import assert from 'assert'
import type { PublicClient } from 'viem'
import { createPublicClient, defineChain, fallback, http } from 'viem'
import {
  arbitrum,
  arbitrumNova,
  avalanche,
  base,
  bsc,
  gnosis,
  hyperEvm,
  mainnet,
  monad,
  optimism,
  plasma,
  polygon,
} from 'viem/chains'

const megaeth = defineChain({
  id: 4326,
  name: 'MegaETH',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://mainnet.megaeth.com/rpc'],
    },
  },
  blockExplorers: {
    default: {
      name: 'MegaETH Explorer',
      url: 'https://megaeth.blockscout.com',
    },
  },
})

export const viemEthMainnetClient = createPublicClient({
  chain: mainnet,
  transport: fallback(
    [process.env.VITE_ETHEREUM_NODE_URL, 'https://eth.llamarpc.com']
      .filter(Boolean)
      .map(url => http(url)),
  ),
}) as PublicClient

export const viemBscClient = createPublicClient({
  chain: bsc,
  transport: fallback(
    // https://github.com/DefiLlama/chainlist/blob/83b8cc32ee79c10e0281e1799ebe4cd1696082b7/constants/llamaNodesRpcs.js#L30
    [process.env.VITE_BNBSMARTCHAIN_NODE_URL, 'https://binance.llamarpc.com']
      .filter(Boolean)
      .map(url => http(url)),
  ),
}) as PublicClient

export const viemAvalancheClient = createPublicClient({
  chain: avalanche,
  transport: fallback([process.env.VITE_AVALANCHE_NODE_URL].filter(Boolean).map(url => http(url))),
}) as PublicClient

export const viemArbitrumClient = createPublicClient({
  chain: arbitrum,
  transport: fallback([process.env.VITE_ARBITRUM_NODE_URL].filter(Boolean).map(url => http(url))),
}) as PublicClient

export const viemArbitrumNovaClient = createPublicClient({
  chain: arbitrumNova,
  transport: fallback(
    [process.env.VITE_ARBITRUM_NOVA_NODE_URL].filter(Boolean).map(url => http(url)),
  ),
}) as PublicClient

export const viemOptimismClient = createPublicClient({
  chain: optimism,
  transport: fallback([process.env.VITE_OPTIMISM_NODE_URL].filter(Boolean).map(url => http(url))),
}) as PublicClient

export const viemGnosisClient = createPublicClient({
  chain: gnosis,
  transport: fallback([process.env.VITE_GNOSIS_NODE_URL].filter(Boolean).map(url => http(url))),
}) as PublicClient

export const viemPolygonClient = createPublicClient({
  chain: polygon,
  transport: fallback([process.env.VITE_POLYGON_NODE_URL].filter(Boolean).map(url => http(url))),
}) as PublicClient

export const viemBaseClient = createPublicClient({
  chain: base,
  transport: fallback(
    // https://github.com/DefiLlama/chainlist/blob/83b8cc32ee79c10e0281e1799ebe4cd1696082b7/constants/llamaNodesRpcs.js#L19
    [process.env.VITE_BASE_NODE_URL, 'https://base.llamarpc.com']
      .filter(Boolean)
      .map(url => http(url)),
  ),
}) as PublicClient

export const viemMonadClient = createPublicClient({
  chain: monad,
  transport: fallback([process.env.VITE_MONAD_NODE_URL].filter(Boolean).map(url => http(url))),
}) as PublicClient

export const viemHyperEvmClient = createPublicClient({
  chain: hyperEvm,
  transport: fallback([process.env.VITE_HYPEREVM_NODE_URL].filter(Boolean).map(url => http(url))),
}) as PublicClient

export const viemPlasmaClient = createPublicClient({
  chain: plasma,
  transport: fallback([process.env.VITE_PLASMA_NODE_URL].filter(Boolean).map(url => http(url))),
}) as PublicClient

export const viemMegaEthClient = createPublicClient({
  chain: megaeth,
  transport: fallback([process.env.VITE_MEGAETH_NODE_URL].filter(Boolean).map(url => http(url))),
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
  [KnownChainIds.MonadMainnet]: viemMonadClient,
  [KnownChainIds.HyperEvmMainnet]: viemHyperEvmClient,
  [KnownChainIds.PlasmaMainnet]: viemPlasmaClient,
  [KnownChainIds.MegaEthMainnet]: viemMegaEthClient,
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
  [KnownChainIds.MonadMainnet]: monad.id,
  [KnownChainIds.HyperEvmMainnet]: hyperEvm.id,
  [KnownChainIds.PlasmaMainnet]: plasma.id,
  [KnownChainIds.MegaEthMainnet]: megaeth.id,
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
  [monad.id]: viemMonadClient,
  [hyperEvm.id]: viemHyperEvmClient,
  [plasma.id]: viemPlasmaClient,
  [megaeth.id]: viemMegaEthClient,
}

export const assertGetViemClient = (chainId: ChainId): PublicClient => {
  const publicClient = viemClientByChainId[chainId]
  assert(publicClient !== undefined, `no public client found for chainId '${chainId}'`)
  return publicClient
}
