import type { ChainId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import assert from 'assert'
import type { PublicClient } from 'viem'
import { createPublicClient, defineChain, fallback, http } from 'viem'
import {
  arbitrum,
  avalanche,
  base,
  blast,
  berachain,
  bob,
  bsc,
  celo,
  flowMainnet,
  cronos,
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
  story,
  zksync,
  worldchain,
  scroll,
  soneium,
  sonic,
  unichain,
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

export const viemMantleClient = createPublicClient({
  chain: mantle,
  transport: fallback([process.env.VITE_MANTLE_NODE_URL].filter(Boolean).map(url => http(url))),
}) as PublicClient

export const viemInkClient = createPublicClient({
  chain: ink,
  transport: fallback([process.env.VITE_INK_NODE_URL].filter(Boolean).map(url => http(url))),
}) as PublicClient

export const viemMegaEthClient = createPublicClient({
  chain: megaeth,
  transport: fallback([process.env.VITE_MEGAETH_NODE_URL].filter(Boolean).map(url => http(url))),
}) as PublicClient

export const viemBerachainClient = createPublicClient({
  chain: berachain,
  transport: fallback([process.env.VITE_BERACHAIN_NODE_URL].filter(Boolean).map(url => http(url))),
}) as PublicClient

export const viemScrollClient = createPublicClient({
  chain: scroll,
  transport: fallback([process.env.VITE_SCROLL_NODE_URL].filter(Boolean).map(url => http(url))),
}) as PublicClient

export const viemCronosClient = createPublicClient({
  chain: cronos,
  transport: fallback([process.env.VITE_CRONOS_NODE_URL].filter(Boolean).map(url => http(url))),
}) as PublicClient

export const viemKatanaClient = createPublicClient({
  chain: katana,
  transport: fallback([process.env.VITE_KATANA_NODE_URL].filter(Boolean).map(url => http(url))),
}) as PublicClient

export const viemCeloClient = createPublicClient({
  chain: celo,
  transport: fallback([process.env.VITE_CELO_NODE_URL].filter(Boolean).map(url => http(url))),
export const viemFlowEvmClient = createPublicClient({
  chain: flowMainnet,
  transport: fallback([process.env.VITE_FLOW_EVM_NODE_URL].filter(Boolean).map(url => http(url))),
export const viemPlumeClient = createPublicClient({
  chain: plumeMainnet,
  transport: fallback([process.env.VITE_PLUME_NODE_URL].filter(Boolean).map(url => http(url))),
export const viemStoryClient = createPublicClient({
  chain: story,
  transport: fallback([process.env.VITE_STORY_NODE_URL].filter(Boolean).map(url => http(url))),
export const viemZkSyncEraClient = createPublicClient({
  chain: zksync,
  transport: fallback([process.env.VITE_ZKSYNC_ERA_NODE_URL].filter(Boolean).map(url => http(url))),
export const viemBlastClient = createPublicClient({
  chain: blast,
  transport: fallback([process.env.VITE_BLAST_NODE_URL].filter(Boolean).map(url => http(url))),
export const viemWorldChainClient = createPublicClient({
  chain: worldchain,
  transport: fallback([process.env.VITE_WORLDCHAIN_NODE_URL].filter(Boolean).map(url => http(url))),
export const viemHemiClient = createPublicClient({
  chain: hemi,
  transport: fallback([process.env.VITE_HEMI_NODE_URL].filter(Boolean).map(url => http(url))),
export const viemLineaClient = createPublicClient({
  chain: linea,
  transport: fallback([process.env.VITE_LINEA_NODE_URL].filter(Boolean).map(url => http(url))),
}) as PublicClient

export const viemSonicClient = createPublicClient({
  chain: sonic,
  transport: fallback([process.env.VITE_SONIC_NODE_URL].filter(Boolean).map(url => http(url))),
}) as PublicClient

export const viemUnichainClient = createPublicClient({
  chain: unichain,
  transport: fallback([process.env.VITE_UNICHAIN_NODE_URL].filter(Boolean).map(url => http(url))),
}) as PublicClient

export const viemBobClient = createPublicClient({
  chain: bob,
  transport: fallback([process.env.VITE_BOB_NODE_URL].filter(Boolean).map(url => http(url))),
}) as PublicClient

export const viemModeClient = createPublicClient({
  chain: mode,
  transport: fallback([process.env.VITE_MODE_NODE_URL].filter(Boolean).map(url => http(url))),
}) as PublicClient

export const viemSoneiumClient = createPublicClient({
  chain: soneium,
  transport: fallback([process.env.VITE_SONEIUM_NODE_URL].filter(Boolean).map(url => http(url))),
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
  [KnownChainIds.MantleMainnet]: viemMantleClient,
  [KnownChainIds.InkMainnet]: viemInkClient,
  [KnownChainIds.MegaEthMainnet]: viemMegaEthClient,
  [KnownChainIds.BerachainMainnet]: viemBerachainClient,
  [KnownChainIds.CronosMainnet]: viemCronosClient,
  [KnownChainIds.KatanaMainnet]: viemKatanaClient,
  [KnownChainIds.CeloMainnet]: viemCeloClient,
  [KnownChainIds.FlowEvmMainnet]: viemFlowEvmClient,
  [KnownChainIds.PlumeMainnet]: viemPlumeClient,
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
  [KnownChainIds.MantleMainnet]: mantle.id,
  [KnownChainIds.InkMainnet]: ink.id,
  [KnownChainIds.MegaEthMainnet]: megaeth.id,
  [KnownChainIds.BerachainMainnet]: berachain.id,
  [KnownChainIds.CronosMainnet]: cronos.id,
  [KnownChainIds.KatanaMainnet]: katana.id,
  [KnownChainIds.CeloMainnet]: celo.id,
  [KnownChainIds.FlowEvmMainnet]: flowMainnet.id,
  [KnownChainIds.PlumeMainnet]: plumeMainnet.id,
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
  [mantle.id]: viemMantleClient,
  [ink.id]: viemInkClient,
  [megaeth.id]: viemMegaEthClient,
  [berachain.id]: viemBerachainClient,
  [cronos.id]: viemCronosClient,
  [katana.id]: viemKatanaClient,
  [celo.id]: viemCeloClient,
  [flowMainnet.id]: viemFlowEvmClient,
  [plumeMainnet.id]: viemPlumeClient,
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
}

export const assertGetViemClient = (chainId: ChainId): PublicClient => {
  const publicClient = viemClientByChainId[chainId]
  assert(publicClient !== undefined, `no public client found for chainId '${chainId}'`)
  return publicClient
}
