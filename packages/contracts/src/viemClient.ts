import type { ChainId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import assert from 'assert'
import type { Chain, PublicClient } from 'viem'
import { createPublicClient, defineChain, fallback, http } from 'viem'
import {
  abstract,
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
  hemi as viemHemi,
  hyperEvm,
  ink,
  katana,
  linea,
  mainnet,
  mantle,
  megaeth,
  mode,
  monad,
  optimism,
  plasma,
  plumeMainnet,
  polygon,
  robinhood,
  scroll,
  sei,
  soneium,
  sonic,
  story,
  unichain,
  worldchain,
  zksync,
} from 'viem/chains'

import { PUBLIC_RPC_URLS } from './publicRpcUrls'

// Builds a viem fallback transport. `privateUrl` is the preferred source (e.g. ShapeShift proxy)
// and is tried first; `publicUrls` are public endpoints used as backups. Pass `undefined` for
// `privateUrl` when the chain has no private RPC (second-class chains).
const createRpcTransport = (privateUrl: string | undefined, publicUrls: readonly string[]) =>
  fallback([privateUrl, ...publicUrls].filter(Boolean).map(url => http(url)))

// Same-tick contract reads are batched into one multicall3 call
const createRpcClient = (
  chain: Chain,
  privateUrl: string | undefined,
  publicUrls: readonly string[],
) =>
  createPublicClient({
    chain,
    transport: createRpcTransport(privateUrl, publicUrls),
    batch: { multicall: true },
  }) as PublicClient

const multicall3 = { address: '0xcA11bde05977b3631167028862bE2a173976CA11' } as const

// First-class EVM chains
export const viemEthMainnetClient = createRpcClient(
  mainnet,
  process.env.VITE_ETHEREUM_NODE_URL,
  PUBLIC_RPC_URLS.ethereum,
)

export const viemBscClient = createRpcClient(
  bsc,
  process.env.VITE_BNBSMARTCHAIN_NODE_URL,
  PUBLIC_RPC_URLS.bsc,
)

export const viemAvalancheClient = createRpcClient(
  avalanche,
  process.env.VITE_AVALANCHE_NODE_URL,
  PUBLIC_RPC_URLS.avalanche,
)

export const viemArbitrumClient = createRpcClient(
  arbitrum,
  process.env.VITE_ARBITRUM_NODE_URL,
  PUBLIC_RPC_URLS.arbitrum,
)

export const viemOptimismClient = createRpcClient(
  optimism,
  process.env.VITE_OPTIMISM_NODE_URL,
  PUBLIC_RPC_URLS.optimism,
)

export const viemGnosisClient = createRpcClient(
  gnosis,
  process.env.VITE_GNOSIS_NODE_URL,
  PUBLIC_RPC_URLS.gnosis,
)

export const viemPolygonClient = createRpcClient(
  polygon,
  process.env.VITE_POLYGON_NODE_URL,
  PUBLIC_RPC_URLS.polygon,
)

export const viemBaseClient = createRpcClient(
  base,
  process.env.VITE_BASE_NODE_URL,
  PUBLIC_RPC_URLS.base,
)

// Second-class EVM chains (public RPCs only)
export const viemMonadClient = createRpcClient(monad, undefined, PUBLIC_RPC_URLS.monad)

export const viemHyperEvmClient = createRpcClient(hyperEvm, undefined, PUBLIC_RPC_URLS.hyperEvm)

export const viemPlasmaClient = createRpcClient(plasma, undefined, PUBLIC_RPC_URLS.plasma)

export const viemPlumeClient = createRpcClient(plumeMainnet, undefined, PUBLIC_RPC_URLS.plume)

export const viemMantleClient = createRpcClient(mantle, undefined, PUBLIC_RPC_URLS.mantle)

export const viemInkClient = createRpcClient(ink, undefined, PUBLIC_RPC_URLS.ink)

export const viemMegaEthClient = createRpcClient(megaeth, undefined, PUBLIC_RPC_URLS.megaEth)

export const viemBerachainClient = createRpcClient(berachain, undefined, PUBLIC_RPC_URLS.berachain)

export const viemScrollClient = createRpcClient(scroll, undefined, PUBLIC_RPC_URLS.scroll)

export const viemCronosClient = createRpcClient(cronos, undefined, PUBLIC_RPC_URLS.cronos)

export const viemFlowEvmClient = createRpcClient(flowMainnet, undefined, PUBLIC_RPC_URLS.flowEvm)

export const viemCeloClient = createRpcClient(celo, undefined, PUBLIC_RPC_URLS.celo)

export const viemKatanaClient = createRpcClient(katana, undefined, PUBLIC_RPC_URLS.katana)

export const ethereal = defineChain({
  id: 5064014,
  name: 'Ethereal',
  nativeCurrency: { name: 'USDe', symbol: 'USDe', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.ethereal.trade'] } },
  blockExplorers: {
    default: { name: 'Ethereal Explorer', url: 'https://explorer.ethereal.global' },
  },
  contracts: { multicall3 },
})

// viem's hemi definition omits the multicall3 deployment
const hemi = defineChain({ ...viemHemi, contracts: { multicall3 } })

export const viemEtherealClient = createRpcClient(ethereal, undefined, PUBLIC_RPC_URLS.ethereal)

export const viemStoryClient = createRpcClient(story, undefined, PUBLIC_RPC_URLS.story)

export const viemZkSyncEraClient = createRpcClient(zksync, undefined, PUBLIC_RPC_URLS.zkSyncEra)

export const viemBlastClient = createRpcClient(blast, undefined, PUBLIC_RPC_URLS.blast)

export const viemWorldChainClient = createRpcClient(
  worldchain,
  undefined,
  PUBLIC_RPC_URLS.worldChain,
)

export const viemHemiClient = createRpcClient(hemi, undefined, PUBLIC_RPC_URLS.hemi)

export const viemSeiClient = createRpcClient(sei, undefined, PUBLIC_RPC_URLS.sei)

export const viemAbstractClient = createRpcClient(abstract, undefined, PUBLIC_RPC_URLS.abstract)

export const viemLineaClient = createRpcClient(linea, undefined, PUBLIC_RPC_URLS.linea)

export const viemSonicClient = createRpcClient(sonic, undefined, PUBLIC_RPC_URLS.sonic)

export const viemUnichainClient = createRpcClient(unichain, undefined, PUBLIC_RPC_URLS.unichain)

export const viemBobClient = createRpcClient(bob, undefined, PUBLIC_RPC_URLS.bob)

export const viemModeClient = createRpcClient(mode, undefined, PUBLIC_RPC_URLS.mode)

export const viemSoneiumClient = createRpcClient(soneium, undefined, PUBLIC_RPC_URLS.soneium)

export const viemRobinhoodClient = createRpcClient(robinhood, undefined, PUBLIC_RPC_URLS.robinhood)

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
  [KnownChainIds.AbstractMainnet]: viemAbstractClient,
  [KnownChainIds.RobinhoodMainnet]: viemRobinhoodClient,
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
  [KnownChainIds.AbstractMainnet]: abstract.id,
  [KnownChainIds.RobinhoodMainnet]: robinhood.id,
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
  [abstract.id]: viemAbstractClient,
  [robinhood.id]: viemRobinhoodClient,
}

export const assertGetViemClient = (chainId: ChainId): PublicClient => {
  const publicClient = viemClientByChainId[chainId]
  assert(publicClient !== undefined, `no public client found for chainId '${chainId}'`)
  return publicClient
}
