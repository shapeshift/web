import type { ChainId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import assert from 'assert'
import type { Chain, PublicClient } from 'viem'
import { createPublicClient, defineChain, fallback, http } from 'viem'
import {
  arbitrum,
  avalanche,
  base,
  bob,
  bsc,
  celo,
  cronos,
  gnosis,
  hyperEvm,
  ink,
  katana,
  mainnet,
  mantle,
  megaeth,
  monad,
  optimism,
  plasma,
  polygon,
  robinhood,
  sei,
  sonic,
  unichain,
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

export const viemMantleClient = createRpcClient(mantle, undefined, PUBLIC_RPC_URLS.mantle)

export const viemInkClient = createRpcClient(ink, undefined, PUBLIC_RPC_URLS.ink)

export const viemMegaEthClient = createRpcClient(megaeth, undefined, PUBLIC_RPC_URLS.megaEth)

export const viemCronosClient = createRpcClient(cronos, undefined, PUBLIC_RPC_URLS.cronos)

export const viemCeloClient = createRpcClient(celo, undefined, PUBLIC_RPC_URLS.celo)

export const viemKatanaClient = createRpcClient(katana, undefined, PUBLIC_RPC_URLS.katana)

export const viemSeiClient = createRpcClient(sei, undefined, PUBLIC_RPC_URLS.sei)

export const viemSonicClient = createRpcClient(sonic, undefined, PUBLIC_RPC_URLS.sonic)

export const viemUnichainClient = createRpcClient(unichain, undefined, PUBLIC_RPC_URLS.unichain)

export const viemBobClient = createRpcClient(bob, undefined, PUBLIC_RPC_URLS.bob)

export const viemRobinhoodClient = createRpcClient(robinhood, undefined, PUBLIC_RPC_URLS.robinhood)

export const elysium = defineChain({
  id: 99901,
  name: 'Elysium',
  nativeCurrency: { name: 'HYPE', symbol: 'HYPE', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.elysium.kinetiq.xyz'] } },
  blockExplorers: {
    default: { name: 'Elysium Explorer', url: 'https://elysium.kinetiq.xyz' },
  },
  contracts: { multicall3 },
})

export const viemElysiumClient = createRpcClient(elysium, undefined, PUBLIC_RPC_URLS.elysium)

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
  [KnownChainIds.CronosMainnet]: viemCronosClient,
  [KnownChainIds.KatanaMainnet]: viemKatanaClient,
  [KnownChainIds.CeloMainnet]: viemCeloClient,
  [KnownChainIds.SonicMainnet]: viemSonicClient,
  [KnownChainIds.UnichainMainnet]: viemUnichainClient,
  [KnownChainIds.BobMainnet]: viemBobClient,
  [KnownChainIds.SeiMainnet]: viemSeiClient,
  [KnownChainIds.RobinhoodMainnet]: viemRobinhoodClient,
  [KnownChainIds.ElysiumMainnet]: viemElysiumClient,
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
  [KnownChainIds.CronosMainnet]: cronos.id,
  [KnownChainIds.KatanaMainnet]: katana.id,
  [KnownChainIds.CeloMainnet]: celo.id,
  [KnownChainIds.SonicMainnet]: sonic.id,
  [KnownChainIds.UnichainMainnet]: unichain.id,
  [KnownChainIds.BobMainnet]: bob.id,
  [KnownChainIds.SeiMainnet]: sei.id,
  [KnownChainIds.RobinhoodMainnet]: robinhood.id,
  [KnownChainIds.ElysiumMainnet]: elysium.id,
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
  [cronos.id]: viemCronosClient,
  [katana.id]: viemKatanaClient,
  [celo.id]: viemCeloClient,
  [sonic.id]: viemSonicClient,
  [unichain.id]: viemUnichainClient,
  [bob.id]: viemBobClient,
  [sei.id]: viemSeiClient,
  [robinhood.id]: viemRobinhoodClient,
  [elysium.id]: viemElysiumClient,
}

export const assertGetViemClient = (chainId: ChainId): PublicClient => {
  const publicClient = viemClientByChainId[chainId]
  assert(publicClient !== undefined, `no public client found for chainId '${chainId}'`)
  return publicClient
}
