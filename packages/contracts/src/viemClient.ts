import type { ChainId, EvmGenericChainConfig, EvmGenericChainId } from '@shapeshiftoss/caip'
import { getGenericChainConfig } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import assert from 'assert'
import type { PublicClient } from 'viem'
import { createPublicClient, defineChain, fallback, http } from 'viem'
import * as chains from 'viem/chains'
import {
  arbitrum,
  arbitrumNova,
  avalanche,
  base,
  bsc,
  celo,
  gnosis,
  hyperEvm,
  katana,
  linea,
  mainnet,
  monad,
  optimism,
  plasma,
  polygon,
  sei,
} from 'viem/chains'

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
  transport: fallback([
    http('https://mainnet.base.org'),
    http('https://base.llamarpc.com'),
    http('https://base.blockpi.network/v1/rpc/public'),
  ]),
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

export const viemKatanaClient = createPublicClient({
  chain: katana,
  transport: fallback([process.env.VITE_KATANA_NODE_URL].filter(Boolean).map(url => http(url))),
}) as PublicClient

export const viemCeloClient = createPublicClient({
  chain: celo,
  transport: fallback(
    [process.env.VITE_CELO_NODE_URL, 'https://forno.celo.org']
      .filter(Boolean)
      .map(url => http(url)),
  ),
}) as PublicClient

export const viemSeiClient = createPublicClient({
  chain: sei,
  transport: fallback(
    [process.env.VITE_SEI_NODE_URL, 'https://evm-rpc.sei-apis.com']
      .filter(Boolean)
      .map(url => http(url)),
  ),
}) as PublicClient

export const viemLineaClient = createPublicClient({
  chain: linea,
  transport: fallback(
    [process.env.VITE_LINEA_NODE_URL, 'https://rpc.linea.build']
      .filter(Boolean)
      .map(url => http(url)),
  ),
}) as PublicClient

const genericChainClientCache: Map<EvmGenericChainId, PublicClient> = new Map()

const extractNetworkId = (chainId: EvmGenericChainId): number => {
  const parts = chainId.split(':')
  return parseInt(parts[1], 10)
}

export const createGenericViemClient = (config: EvmGenericChainConfig): PublicClient => {
  const cached = genericChainClientCache.get(config.chainId)
  if (cached) return cached

  const networkId = extractNetworkId(config.chainId)

  const viemChain =
    config.viemChainKey !== undefined
      ? (chains[config.viemChainKey] as chains.Chain)
      : defineChain({
          id: networkId,
          name: config.name,
          nativeCurrency: {
            decimals: 18,
            name: config.name,
            symbol: config.name.substring(0, 4).toUpperCase(),
          },
          rpcUrls: {
            default: {
              http: config.rpcUrl ? [config.rpcUrl] : [],
            },
          },
          blockExplorers: config.explorerUrl
            ? {
                default: {
                  name: 'Explorer',
                  url: config.explorerUrl,
                },
              }
            : undefined,
          contracts: config.multicallAddress
            ? {
                multicall3: {
                  address: config.multicallAddress,
                },
              }
            : undefined,
        })

  // Use custom RPC URL if provided, otherwise use chain's default RPC URLs
  const rpcUrls = config.rpcUrl ? [config.rpcUrl] : viemChain.rpcUrls.default.http.filter(Boolean)

  const client = createPublicClient({
    chain: viemChain as chains.Chain,
    transport: fallback(rpcUrls.map(url => http(url))),
  }) as PublicClient

  genericChainClientCache.set(config.chainId, client)
  return client
}

export const getOrCreateViemClient = (chainId: ChainId): PublicClient | undefined => {
  const knownClient = viemClientByChainId[chainId]
  if (knownClient) return knownClient

  const genericConfig = getGenericChainConfig(chainId)
  if (genericConfig) return createGenericViemClient(genericConfig)

  return undefined
}

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
  [KnownChainIds.KatanaMainnet]: viemKatanaClient,
  [KnownChainIds.CeloMainnet]: viemCeloClient,
  [KnownChainIds.LineaMainnet]: viemLineaClient,
  [KnownChainIds.SeiMainnet]: viemSeiClient,
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
  [KnownChainIds.KatanaMainnet]: katana.id,
  [KnownChainIds.CeloMainnet]: celo.id,
  [KnownChainIds.LineaMainnet]: linea.id,
  [KnownChainIds.SeiMainnet]: sei.id,
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
  [katana.id]: viemKatanaClient,
  [celo.id]: viemCeloClient,
  [linea.id]: viemLineaClient,
  [sei.id]: viemSeiClient,
}

export const assertGetViemClient = (chainId: ChainId): PublicClient => {
  const publicClient = viemClientByChainId[chainId]
  assert(publicClient !== undefined, `no public client found for chainId '${chainId}'`)
  return publicClient
}
