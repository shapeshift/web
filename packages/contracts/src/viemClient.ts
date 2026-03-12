import type { ChainId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import assert from 'assert'
import type { PublicClient } from 'viem'
import { createPublicClient, defineChain, fallback, http } from 'viem'
import {
  arbitrum,
  avalanche,
  base,
  berachain,
  blast,
  bob,
  bsc,
  celo,
  cronos,
  flowMainnet,
  gnosis,
  hemi,
  hyperEvm,
  ink,
  katana,
  linea,
  mainnet,
  mantle,
  mode,
  monad,
  optimism,
  plasma,
  plumeMainnet,
  polygon,
  scroll,
  sei,
  soneium,
  sonic,
  story,
  unichain,
  worldchain,
  zksync,
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

export const flowEvmChain = flowMainnet

const FALLBACK_RPC_URLS = {
  ethereum: ['https://eth.llamarpc.com'],
  bsc: ['https://binance.llamarpc.com'],
  avalanche: ['https://api.avax.network/ext/bc/C/rpc', 'https://avalanche.llamarpc.com'],
  arbitrum: ['https://arb1.arbitrum.io/rpc', 'https://arbitrum.llamarpc.com'],
  optimism: ['https://mainnet.optimism.io', 'https://optimism.llamarpc.com'],
  gnosis: ['https://rpc.gnosischain.com', 'https://gnosis.llamarpc.com'],
  polygon: ['https://polygon-rpc.com', 'https://polygon.llamarpc.com'],
  base: [
    'https://mainnet.base.org',
    'https://base.llamarpc.com',
    'https://base.blockpi.network/v1/rpc/public',
  ],
  monad: ['https://rpc.monad.xyz'],
  hyperEvm: ['https://rpc.hyperliquid.xyz/evm'],
  plasma: ['https://rpc.plasma.to'],
  plume: ['https://rpc.plumenetwork.xyz'],
  mantle: ['https://rpc.mantle.xyz', 'https://mantle.llamarpc.com'],
  ink: ['https://rpc-gel.inkonchain.com', 'https://rpc-qnd.inkonchain.com'],
  megaEth: ['https://mainnet.megaeth.com/rpc'],
  berachain: ['https://rpc.berachain.com', 'https://berachain.llamarpc.com'],
  scroll: ['https://rpc.scroll.io', 'https://scroll.llamarpc.com'],
  cronos: ['https://evm.cronos.org', 'https://cronos.llamarpc.com'],
  flowEvm: ['https://mainnet.evm.nodes.onflow.org'],
  celo: ['https://forno.celo.org'],
  katana: ['https://rpc.katana.network'],
  story: ['https://mainnet.storyrpc.io'],
  zkSyncEra: ['https://mainnet.era.zksync.io', 'https://zksync.llamarpc.com'],
  blast: ['https://rpc.blast.io', 'https://blast.llamarpc.com'],
  worldChain: ['https://worldchain-mainnet.g.alchemy.com/public'],
  hemi: ['https://rpc.hemi.network/rpc'],
  linea: ['https://rpc.linea.build', 'https://linea.llamarpc.com'],
  sonic: ['https://rpc.soniclabs.com', 'https://sonic.llamarpc.com'],
  unichain: ['https://mainnet.unichain.org'],
  bob: ['https://rpc.gobob.xyz'],
  mode: ['https://mainnet.mode.network', 'https://mode.llamarpc.com'],
  soneium: ['https://rpc.soneium.org'],
} as const

const createFallbackTransport = (envUrl: string | undefined, fallbacks: readonly string[]) =>
  fallback([envUrl, ...fallbacks].filter(Boolean).map(url => http(url)))

export const viemEthMainnetClient = createPublicClient({
  chain: mainnet,
  transport: createFallbackTransport(
    process.env.VITE_ETHEREUM_NODE_URL,
    FALLBACK_RPC_URLS.ethereum,
  ),
}) as PublicClient

export const viemBscClient = createPublicClient({
  chain: bsc,
  transport: createFallbackTransport(
    process.env.VITE_BNBSMARTCHAIN_NODE_URL,
    FALLBACK_RPC_URLS.bsc,
  ),
}) as PublicClient

export const viemAvalancheClient = createPublicClient({
  chain: avalanche,
  transport: createFallbackTransport(
    process.env.VITE_AVALANCHE_NODE_URL,
    FALLBACK_RPC_URLS.avalanche,
  ),
}) as PublicClient

export const viemArbitrumClient = createPublicClient({
  chain: arbitrum,
  transport: createFallbackTransport(
    process.env.VITE_ARBITRUM_NODE_URL,
    FALLBACK_RPC_URLS.arbitrum,
  ),
}) as PublicClient

export const viemOptimismClient = createPublicClient({
  chain: optimism,
  transport: createFallbackTransport(
    process.env.VITE_OPTIMISM_NODE_URL,
    FALLBACK_RPC_URLS.optimism,
  ),
}) as PublicClient

export const viemGnosisClient = createPublicClient({
  chain: gnosis,
  transport: createFallbackTransport(process.env.VITE_GNOSIS_NODE_URL, FALLBACK_RPC_URLS.gnosis),
}) as PublicClient

export const viemPolygonClient = createPublicClient({
  chain: polygon,
  transport: createFallbackTransport(process.env.VITE_POLYGON_NODE_URL, FALLBACK_RPC_URLS.polygon),
}) as PublicClient

export const viemBaseClient = createPublicClient({
  chain: base,
  transport: createFallbackTransport(undefined, FALLBACK_RPC_URLS.base),
}) as PublicClient

export const viemMonadClient = createPublicClient({
  chain: monad,
  transport: createFallbackTransport(process.env.VITE_MONAD_NODE_URL, FALLBACK_RPC_URLS.monad),
}) as PublicClient

export const viemHyperEvmClient = createPublicClient({
  chain: hyperEvm,
  transport: createFallbackTransport(
    process.env.VITE_HYPEREVM_NODE_URL,
    FALLBACK_RPC_URLS.hyperEvm,
  ),
}) as PublicClient

export const viemPlasmaClient = createPublicClient({
  chain: plasma,
  transport: createFallbackTransport(process.env.VITE_PLASMA_NODE_URL, FALLBACK_RPC_URLS.plasma),
}) as PublicClient

export const viemPlumeClient = createPublicClient({
  chain: plumeMainnet,
  transport: createFallbackTransport(process.env.VITE_PLUME_NODE_URL, FALLBACK_RPC_URLS.plume),
}) as PublicClient

export const viemMantleClient = createPublicClient({
  chain: mantle,
  transport: createFallbackTransport(process.env.VITE_MANTLE_NODE_URL, FALLBACK_RPC_URLS.mantle),
}) as PublicClient

export const viemInkClient = createPublicClient({
  chain: ink,
  transport: createFallbackTransport(process.env.VITE_INK_NODE_URL, FALLBACK_RPC_URLS.ink),
}) as PublicClient

export const viemMegaEthClient = createPublicClient({
  chain: megaeth,
  transport: createFallbackTransport(process.env.VITE_MEGAETH_NODE_URL, FALLBACK_RPC_URLS.megaEth),
}) as PublicClient

export const viemBerachainClient = createPublicClient({
  chain: berachain,
  transport: createFallbackTransport(
    process.env.VITE_BERACHAIN_NODE_URL,
    FALLBACK_RPC_URLS.berachain,
  ),
}) as PublicClient

export const viemScrollClient = createPublicClient({
  chain: scroll,
  transport: createFallbackTransport(process.env.VITE_SCROLL_NODE_URL, FALLBACK_RPC_URLS.scroll),
}) as PublicClient

export const viemCronosClient = createPublicClient({
  chain: cronos,
  transport: createFallbackTransport(process.env.VITE_CRONOS_NODE_URL, FALLBACK_RPC_URLS.cronos),
}) as PublicClient

export const viemFlowEvmClient = createPublicClient({
  chain: flowMainnet,
  transport: createFallbackTransport(process.env.VITE_FLOWEVM_NODE_URL, FALLBACK_RPC_URLS.flowEvm),
}) as PublicClient

export const viemCeloClient = createPublicClient({
  chain: celo,
  transport: createFallbackTransport(process.env.VITE_CELO_NODE_URL, FALLBACK_RPC_URLS.celo),
}) as PublicClient

export const viemKatanaClient = createPublicClient({
  chain: katana,
  transport: createFallbackTransport(process.env.VITE_KATANA_NODE_URL, FALLBACK_RPC_URLS.katana),
}) as PublicClient

export const ethereal = defineChain({
  id: 5064014,
  name: 'Ethereal',
  nativeCurrency: { name: 'USDe', symbol: 'USDe', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.ethereal.trade'] } },
  blockExplorers: {
    default: { name: 'Ethereal Explorer', url: 'https://explorer.ethereal.global' },
  },
})

export const viemEtherealClient = createPublicClient({
  chain: ethereal,
  transport: fallback([process.env.VITE_ETHEREAL_NODE_URL].filter(Boolean).map(url => http(url))),
}) as PublicClient

export const viemStoryClient = createPublicClient({
  chain: story,
  transport: createFallbackTransport(process.env.VITE_STORY_NODE_URL, FALLBACK_RPC_URLS.story),
}) as PublicClient

export const viemZkSyncEraClient = createPublicClient({
  chain: zksync,
  transport: createFallbackTransport(
    process.env.VITE_ZKSYNC_ERA_NODE_URL,
    FALLBACK_RPC_URLS.zkSyncEra,
  ),
}) as PublicClient

export const viemBlastClient = createPublicClient({
  chain: blast,
  transport: createFallbackTransport(process.env.VITE_BLAST_NODE_URL, FALLBACK_RPC_URLS.blast),
}) as PublicClient

export const viemWorldChainClient = createPublicClient({
  chain: worldchain,
  transport: createFallbackTransport(
    process.env.VITE_WORLDCHAIN_NODE_URL,
    FALLBACK_RPC_URLS.worldChain,
  ),
}) as PublicClient

export const viemHemiClient = createPublicClient({
  chain: hemi,
  transport: createFallbackTransport(process.env.VITE_HEMI_NODE_URL, FALLBACK_RPC_URLS.hemi),
}) as PublicClient

export const viemSeiClient = createPublicClient({
  chain: sei,
  transport: fallback([process.env.VITE_SEI_NODE_URL].filter(Boolean).map(url => http(url))),
}) as PublicClient

export const viemLineaClient = createPublicClient({
  chain: linea,
  transport: createFallbackTransport(process.env.VITE_LINEA_NODE_URL, FALLBACK_RPC_URLS.linea),
}) as PublicClient

export const viemSonicClient = createPublicClient({
  chain: sonic,
  transport: createFallbackTransport(process.env.VITE_SONIC_NODE_URL, FALLBACK_RPC_URLS.sonic),
}) as PublicClient

export const viemUnichainClient = createPublicClient({
  chain: unichain,
  transport: createFallbackTransport(
    process.env.VITE_UNICHAIN_NODE_URL,
    FALLBACK_RPC_URLS.unichain,
  ),
}) as PublicClient

export const viemBobClient = createPublicClient({
  chain: bob,
  transport: createFallbackTransport(process.env.VITE_BOB_NODE_URL, FALLBACK_RPC_URLS.bob),
}) as PublicClient

export const viemModeClient = createPublicClient({
  chain: mode,
  transport: createFallbackTransport(process.env.VITE_MODE_NODE_URL, FALLBACK_RPC_URLS.mode),
}) as PublicClient

export const viemSoneiumClient = createPublicClient({
  chain: soneium,
  transport: createFallbackTransport(process.env.VITE_SONEIUM_NODE_URL, FALLBACK_RPC_URLS.soneium),
}) as PublicClient

export const viemClientByChainId: Record<ChainId, PublicClient> = {
  [KnownChainIds.EthereumMainnet]: viemEthMainnetClient,
  [KnownChainIds.BnbSmartChainMainnet]: viemBscClient,
  [KnownChainIds.AvalancheMainnet]: viemAvalancheClient,
  [KnownChainIds.ArbitrumMainnet]: viemArbitrumClient,
  [KnownChainIds.GnosisMainnet]: viemGnosisClient,
  [KnownChainIds.PolygonMainnet]: viemPolygonClient,
  [KnownChainIds.OptimismMainnet]: viemOptimismClient,
  [KnownChainIds.BaseMainnet]: viemBaseClient,
  [KnownChainIds.MonadMainnet]: viemMonadClient,
  [KnownChainIds.HyperEvmMainnet]: viemHyperEvmClient,
  [KnownChainIds.PlasmaMainnet]: viemPlasmaClient,
  [KnownChainIds.PlumeMainnet]: viemPlumeClient,
  [KnownChainIds.MantleMainnet]: viemMantleClient,
  [KnownChainIds.InkMainnet]: viemInkClient,
  [KnownChainIds.MegaEthMainnet]: viemMegaEthClient,
  [KnownChainIds.BerachainMainnet]: viemBerachainClient,
  [KnownChainIds.CronosMainnet]: viemCronosClient,
  [KnownChainIds.KatanaMainnet]: viemKatanaClient,
  [KnownChainIds.EtherealMainnet]: viemEtherealClient,
  [KnownChainIds.FlowEvmMainnet]: viemFlowEvmClient,
  [KnownChainIds.CeloMainnet]: viemCeloClient,
  [KnownChainIds.StoryMainnet]: viemStoryClient,
  [KnownChainIds.ZkSyncEraMainnet]: viemZkSyncEraClient,
  [KnownChainIds.BlastMainnet]: viemBlastClient,
  [KnownChainIds.WorldChainMainnet]: viemWorldChainClient,
  [KnownChainIds.HemiMainnet]: viemHemiClient,
  [KnownChainIds.LineaMainnet]: viemLineaClient,
  [KnownChainIds.ScrollMainnet]: viemScrollClient,
  [KnownChainIds.SonicMainnet]: viemSonicClient,
  [KnownChainIds.UnichainMainnet]: viemUnichainClient,
  [KnownChainIds.BobMainnet]: viemBobClient,
  [KnownChainIds.ModeMainnet]: viemModeClient,
  [KnownChainIds.SoneiumMainnet]: viemSoneiumClient,
  [KnownChainIds.SeiMainnet]: viemSeiClient,
}

export const viemNetworkIdByChainId: Record<ChainId, number> = {
  [KnownChainIds.EthereumMainnet]: mainnet.id,
  [KnownChainIds.BnbSmartChainMainnet]: bsc.id,
  [KnownChainIds.AvalancheMainnet]: avalanche.id,
  [KnownChainIds.ArbitrumMainnet]: arbitrum.id,
  [KnownChainIds.GnosisMainnet]: gnosis.id,
  [KnownChainIds.PolygonMainnet]: polygon.id,
  [KnownChainIds.OptimismMainnet]: optimism.id,
  [KnownChainIds.BaseMainnet]: base.id,
  [KnownChainIds.MonadMainnet]: monad.id,
  [KnownChainIds.HyperEvmMainnet]: hyperEvm.id,
  [KnownChainIds.PlasmaMainnet]: plasma.id,
  [KnownChainIds.PlumeMainnet]: plumeMainnet.id,
  [KnownChainIds.MantleMainnet]: mantle.id,
  [KnownChainIds.InkMainnet]: ink.id,
  [KnownChainIds.MegaEthMainnet]: megaeth.id,
  [KnownChainIds.BerachainMainnet]: berachain.id,
  [KnownChainIds.CronosMainnet]: cronos.id,
  [KnownChainIds.KatanaMainnet]: katana.id,
  [KnownChainIds.EtherealMainnet]: ethereal.id,
  [KnownChainIds.FlowEvmMainnet]: flowMainnet.id,
  [KnownChainIds.CeloMainnet]: celo.id,
  [KnownChainIds.StoryMainnet]: story.id,
  [KnownChainIds.ZkSyncEraMainnet]: zksync.id,
  [KnownChainIds.BlastMainnet]: blast.id,
  [KnownChainIds.WorldChainMainnet]: worldchain.id,
  [KnownChainIds.HemiMainnet]: hemi.id,
  [KnownChainIds.LineaMainnet]: linea.id,
  [KnownChainIds.ScrollMainnet]: scroll.id,
  [KnownChainIds.SonicMainnet]: sonic.id,
  [KnownChainIds.UnichainMainnet]: unichain.id,
  [KnownChainIds.BobMainnet]: bob.id,
  [KnownChainIds.ModeMainnet]: mode.id,
  [KnownChainIds.SoneiumMainnet]: soneium.id,
  [KnownChainIds.SeiMainnet]: sei.id,
}

export const viemClientByNetworkId: Record<number, PublicClient> = {
  [mainnet.id]: viemEthMainnetClient,
  [bsc.id]: viemBscClient,
  [avalanche.id]: viemAvalancheClient,
  [arbitrum.id]: viemArbitrumClient,
  [gnosis.id]: viemGnosisClient,
  [polygon.id]: viemPolygonClient,
  [optimism.id]: viemOptimismClient,
  [base.id]: viemBaseClient,
  [monad.id]: viemMonadClient,
  [hyperEvm.id]: viemHyperEvmClient,
  [plasma.id]: viemPlasmaClient,
  [plumeMainnet.id]: viemPlumeClient,
  [mantle.id]: viemMantleClient,
  [ink.id]: viemInkClient,
  [megaeth.id]: viemMegaEthClient,
  [berachain.id]: viemBerachainClient,
  [cronos.id]: viemCronosClient,
  [katana.id]: viemKatanaClient,
  [ethereal.id]: viemEtherealClient,
  [flowMainnet.id]: viemFlowEvmClient,
  [celo.id]: viemCeloClient,
  [story.id]: viemStoryClient,
  [zksync.id]: viemZkSyncEraClient,
  [blast.id]: viemBlastClient,
  [worldchain.id]: viemWorldChainClient,
  [hemi.id]: viemHemiClient,
  [linea.id]: viemLineaClient,
  [scroll.id]: viemScrollClient,
  [sonic.id]: viemSonicClient,
  [unichain.id]: viemUnichainClient,
  [bob.id]: viemBobClient,
  [mode.id]: viemModeClient,
  [soneium.id]: viemSoneiumClient,
  [sei.id]: viemSeiClient,
}

export const assertGetViemClient = (chainId: ChainId): PublicClient => {
  const publicClient = viemClientByChainId[chainId]
  assert(publicClient !== undefined, `no public client found for chainId '${chainId}'`)
  return publicClient
}
