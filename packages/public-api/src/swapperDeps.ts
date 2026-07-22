import type { ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import * as adapters from '@shapeshiftoss/chain-adapters'
import type { SwapperDeps } from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'

import { getAssetsById } from './assets'
import { getServerConfig } from './config'
import { env } from './env'

// ws is required by chain-adapter constructors but the public-api never
// subscribes to txs, so the URL is never dialed.
const wsPlaceholderUrl = 'ws://localhost'

// Second-class EVM and Starknet adapters resolve their token list lazily from the
// loaded asset data, mirroring the main web app's per-chain getKnownTokens closures.
const makeGetKnownTokens =
  (chainId: ChainId, assetNamespace: string, normalizeAddress?: (reference: string) => string) =>
  () =>
    Object.values(getAssetsById())
      .filter((asset): asset is Asset => {
        if (!asset) return false
        const { chainId: assetChainId, assetNamespace: namespace } = fromAssetId(asset.assetId)
        return assetChainId === chainId && namespace === assetNamespace
      })
      .map(asset => {
        const { assetReference } = fromAssetId(asset.assetId)
        return {
          assetId: asset.assetId,
          contractAddress: normalizeAddress ? normalizeAddress(assetReference) : assetReference,
          symbol: asset.symbol,
          name: asset.name,
          precision: asset.precision,
        }
      })

// Starknet contract addresses are stored unpadded; the adapter matches on 64-char hex.
const normalizeStarknetAddress = (reference: string) =>
  reference.startsWith('0x')
    ? `0x${reference.slice(2).padStart(64, '0')}`
    : `0x${reference.padStart(64, '0')}`

const evmAdapters: Record<ChainId, adapters.EvmChainAdapter> = {
  [KnownChainIds.EthereumMainnet]: new adapters.ethereum.ChainAdapter({
    providers: {
      http: new unchained.ethereum.V1Api(
        new unchained.ethereum.Configuration({ basePath: env.UNCHAINED_ETHEREUM_HTTP_URL }),
      ),
      ws: new unchained.ws.Client<unchained.ethereum.Tx>(wsPlaceholderUrl),
    },
    rpcUrl: env.VITE_ETHEREUM_NODE_URL,
    thorMidgardUrl: env.THORCHAIN_MIDGARD_URL,
    mayaMidgardUrl: env.MAYACHAIN_MIDGARD_URL,
  }),
  [KnownChainIds.AvalancheMainnet]: new adapters.avalanche.ChainAdapter({
    providers: {
      http: new unchained.avalanche.V1Api(
        new unchained.avalanche.Configuration({ basePath: env.UNCHAINED_AVALANCHE_HTTP_URL }),
      ),
      ws: new unchained.ws.Client<unchained.avalanche.Tx>(wsPlaceholderUrl),
    },
    rpcUrl: env.VITE_AVALANCHE_NODE_URL,
    midgardUrl: env.THORCHAIN_MIDGARD_URL,
  }),
  [KnownChainIds.OptimismMainnet]: new adapters.optimism.ChainAdapter({
    providers: {
      http: new unchained.optimism.V1Api(
        new unchained.optimism.Configuration({ basePath: env.UNCHAINED_OPTIMISM_HTTP_URL }),
      ),
      ws: new unchained.ws.Client<unchained.optimism.Tx>(wsPlaceholderUrl),
    },
    rpcUrl: env.VITE_OPTIMISM_NODE_URL,
  }),
  [KnownChainIds.BnbSmartChainMainnet]: new adapters.bnbsmartchain.ChainAdapter({
    providers: {
      http: new unchained.bnbsmartchain.V1Api(
        new unchained.bnbsmartchain.Configuration({
          basePath: env.UNCHAINED_BNBSMARTCHAIN_HTTP_URL,
        }),
      ),
      ws: new unchained.ws.Client<unchained.bnbsmartchain.Tx>(wsPlaceholderUrl),
    },
    rpcUrl: env.VITE_BNBSMARTCHAIN_NODE_URL,
    midgardUrl: env.THORCHAIN_MIDGARD_URL,
  }),
  [KnownChainIds.PolygonMainnet]: new adapters.polygon.ChainAdapter({
    providers: {
      http: new unchained.polygon.V1Api(
        new unchained.polygon.Configuration({ basePath: env.UNCHAINED_POLYGON_HTTP_URL }),
      ),
      ws: new unchained.ws.Client<unchained.polygon.Tx>(wsPlaceholderUrl),
    },
    rpcUrl: env.VITE_POLYGON_NODE_URL,
  }),
  [KnownChainIds.GnosisMainnet]: new adapters.gnosis.ChainAdapter({
    providers: {
      http: new unchained.gnosis.V1Api(
        new unchained.gnosis.Configuration({ basePath: env.UNCHAINED_GNOSIS_HTTP_URL }),
      ),
      ws: new unchained.ws.Client<unchained.gnosis.Tx>(wsPlaceholderUrl),
    },
    rpcUrl: env.VITE_GNOSIS_NODE_URL,
  }),
  [KnownChainIds.ArbitrumMainnet]: new adapters.arbitrum.ChainAdapter({
    providers: {
      http: new unchained.arbitrum.V1Api(
        new unchained.arbitrum.Configuration({ basePath: env.UNCHAINED_ARBITRUM_HTTP_URL }),
      ),
      ws: new unchained.ws.Client<unchained.arbitrum.Tx>(wsPlaceholderUrl),
    },
    rpcUrl: env.VITE_ARBITRUM_NODE_URL,
    mayaMidgardUrl: env.MAYACHAIN_MIDGARD_URL,
  }),
  [KnownChainIds.BaseMainnet]: new adapters.base.ChainAdapter({
    providers: {
      http: new unchained.base.V1Api(
        new unchained.base.Configuration({ basePath: env.UNCHAINED_BASE_HTTP_URL }),
      ),
      ws: new unchained.ws.Client<unchained.base.Tx>(wsPlaceholderUrl),
    },
    rpcUrl: env.VITE_BASE_NODE_URL,
  }),
  // Second-class EVM chains — rpcUrl + lazily-resolved known tokens, no unchained http/ws.
  [KnownChainIds.HyperEvmMainnet]: new adapters.hyperevm.ChainAdapter({
    rpcUrl: env.VITE_HYPEREVM_NODE_URL,
    getKnownTokens: makeGetKnownTokens(KnownChainIds.HyperEvmMainnet, 'erc20'),
  }),
  [KnownChainIds.KatanaMainnet]: new adapters.katana.ChainAdapter({
    rpcUrl: env.VITE_KATANA_NODE_URL,
    getKnownTokens: makeGetKnownTokens(KnownChainIds.KatanaMainnet, 'erc20'),
  }),
  [KnownChainIds.MegaEthMainnet]: new adapters.megaeth.ChainAdapter({
    rpcUrl: env.VITE_MEGAETH_NODE_URL,
    getKnownTokens: makeGetKnownTokens(KnownChainIds.MegaEthMainnet, 'erc20'),
  }),
  [KnownChainIds.MonadMainnet]: new adapters.monad.ChainAdapter({
    rpcUrl: env.VITE_MONAD_NODE_URL,
    getKnownTokens: makeGetKnownTokens(KnownChainIds.MonadMainnet, 'erc20'),
  }),
  [KnownChainIds.PlasmaMainnet]: new adapters.plasma.ChainAdapter({
    rpcUrl: env.VITE_PLASMA_NODE_URL,
    getKnownTokens: makeGetKnownTokens(KnownChainIds.PlasmaMainnet, 'erc20'),
  }),
}

const utxoAdapters: Record<ChainId, adapters.UtxoChainAdapter> = {
  [KnownChainIds.BitcoinMainnet]: new adapters.bitcoin.ChainAdapter({
    providers: {
      http: new unchained.bitcoin.V1Api(
        new unchained.bitcoin.Configuration({ basePath: env.UNCHAINED_BITCOIN_HTTP_URL }),
      ),
      ws: new unchained.ws.Client<unchained.bitcoin.Tx>(wsPlaceholderUrl),
    },
    coinName: 'Bitcoin',
    thorMidgardUrl: env.THORCHAIN_MIDGARD_URL,
    mayaMidgardUrl: env.MAYACHAIN_MIDGARD_URL,
  }),
  [KnownChainIds.DogecoinMainnet]: new adapters.dogecoin.ChainAdapter({
    providers: {
      http: new unchained.dogecoin.V1Api(
        new unchained.dogecoin.Configuration({ basePath: env.UNCHAINED_DOGECOIN_HTTP_URL }),
      ),
      ws: new unchained.ws.Client<unchained.dogecoin.Tx>(wsPlaceholderUrl),
    },
    coinName: 'Dogecoin',
    thorMidgardUrl: env.THORCHAIN_MIDGARD_URL,
  }),
  [KnownChainIds.LitecoinMainnet]: new adapters.litecoin.ChainAdapter({
    providers: {
      http: new unchained.litecoin.V1Api(
        new unchained.litecoin.Configuration({ basePath: env.UNCHAINED_LITECOIN_HTTP_URL }),
      ),
      ws: new unchained.ws.Client<unchained.litecoin.Tx>(wsPlaceholderUrl),
    },
    coinName: 'Litecoin',
    thorMidgardUrl: env.THORCHAIN_MIDGARD_URL,
  }),
  [KnownChainIds.BitcoinCashMainnet]: new adapters.bitcoincash.ChainAdapter({
    providers: {
      http: new unchained.bitcoincash.V1Api(
        new unchained.bitcoincash.Configuration({ basePath: env.UNCHAINED_BITCOINCASH_HTTP_URL }),
      ),
      ws: new unchained.ws.Client<unchained.bitcoincash.Tx>(wsPlaceholderUrl),
    },
    coinName: 'BitcoinCash',
    thorMidgardUrl: env.THORCHAIN_MIDGARD_URL,
  }),
  [KnownChainIds.ZcashMainnet]: new adapters.zcash.ChainAdapter({
    providers: {
      http: new unchained.zcash.V1Api(
        new unchained.zcash.Configuration({ basePath: env.UNCHAINED_ZCASH_HTTP_URL }),
      ),
      ws: new unchained.ws.Client<unchained.utxo.Tx>(wsPlaceholderUrl),
    },
    coinName: 'Zcash',
    thorMidgardUrl: env.THORCHAIN_MIDGARD_URL,
    mayaMidgardUrl: env.MAYACHAIN_MIDGARD_URL,
  }),
}

const cosmosSdkAdapters: Record<ChainId, adapters.CosmosSdkChainAdapter> = {
  [KnownChainIds.CosmosMainnet]: new adapters.cosmos.ChainAdapter({
    providers: {
      http: new unchained.cosmos.V1Api(
        new unchained.cosmos.Configuration({ basePath: env.UNCHAINED_COSMOS_HTTP_URL }),
      ),
      ws: new unchained.ws.Client<unchained.cosmossdk.Tx>(wsPlaceholderUrl),
    },
    coinName: 'Cosmos',
    midgardUrl: env.THORCHAIN_MIDGARD_URL,
  }),
  [KnownChainIds.ThorchainMainnet]: new adapters.thorchain.ChainAdapter({
    providers: {
      http: new unchained.thorchain.V1Api(
        new unchained.thorchain.Configuration({ basePath: env.UNCHAINED_THORCHAIN_HTTP_URL }),
      ),
      ws: new unchained.ws.Client<unchained.cosmossdk.Tx>(wsPlaceholderUrl),
    },
    coinName: 'Thorchain',
    thorMidgardUrl: env.THORCHAIN_MIDGARD_URL,
    mayaMidgardUrl: env.MAYACHAIN_MIDGARD_URL,
    httpV1: new unchained.thorchainV1.V1Api(
      new unchained.thorchainV1.Configuration({ basePath: env.UNCHAINED_THORCHAIN_V1_HTTP_URL }),
    ),
  }),
  [KnownChainIds.MayachainMainnet]: new adapters.mayachain.ChainAdapter({
    providers: {
      http: new unchained.mayachain.V1Api(
        new unchained.mayachain.Configuration({ basePath: env.UNCHAINED_MAYACHAIN_HTTP_URL }),
      ),
      ws: new unchained.ws.Client<unchained.cosmossdk.Tx>(wsPlaceholderUrl),
    },
    coinName: 'Mayachain',
    midgardUrl: env.MAYACHAIN_MIDGARD_URL,
  }),
}

const solanaAdapter = new adapters.solana.ChainAdapter({
  providers: {
    http: new unchained.solana.V1Api(
      new unchained.solana.Configuration({ basePath: env.UNCHAINED_SOLANA_HTTP_URL }),
    ),
    ws: new unchained.ws.Client<unchained.solana.Tx>(wsPlaceholderUrl),
  },
  rpcUrl: env.SOLANA_NODE_URL,
})

const tronAdapter = new adapters.tron.ChainAdapter({
  providers: {
    http: new unchained.tron.TronApi({
      rpcUrl: env.TRON_NODE_URL,
      apiKey: env.TRON_GRID_API_KEY,
    }),
  },
  rpcUrl: env.TRON_NODE_URL,
  apiKey: env.TRON_GRID_API_KEY,
})

const suiAdapter = new adapters.sui.ChainAdapter({ rpcUrl: env.SUI_NODE_URL })

const tonAdapter = new adapters.ton.ChainAdapter({ rpcUrl: env.TON_NODE_URL })

const nearAdapter = new adapters.near.ChainAdapter({
  rpcUrls: [env.NEAR_NODE_URL, env.NEAR_NODE_URL_FALLBACK_1, env.NEAR_NODE_URL_FALLBACK_2].filter(
    Boolean,
  ),
  fastNearApiUrl: env.FASTNEAR_API_URL,
})

const starknetAdapter = new adapters.starknet.ChainAdapter({
  rpcUrl: env.STARKNET_NODE_URL,
  getKnownTokens: makeGetKnownTokens(
    KnownChainIds.StarknetMainnet,
    'token',
    normalizeStarknetAddress,
  ),
})

const otherAdaptersById: Record<ChainId, unknown> = {
  [KnownChainIds.SolanaMainnet]: solanaAdapter,
  [KnownChainIds.TronMainnet]: tronAdapter,
  [KnownChainIds.SuiMainnet]: suiAdapter,
  [KnownChainIds.TonMainnet]: tonAdapter,
  [KnownChainIds.NearMainnet]: nearAdapter,
  [KnownChainIds.StarknetMainnet]: starknetAdapter,
}

export const getSwapperDeps = (): SwapperDeps => ({
  assetsById: getAssetsById(),
  config: getServerConfig(),
  mixPanel: undefined,
  assertGetChainAdapter: (chainId: ChainId) => {
    const adapter =
      evmAdapters[chainId] ??
      utxoAdapters[chainId] ??
      cosmosSdkAdapters[chainId] ??
      otherAdaptersById[chainId]
    if (!adapter) throw new Error(`No chain adapter registered for ${chainId}`)
    return adapter as adapters.ChainAdapter<KnownChainIds>
  },
  assertGetEvmChainAdapter: (chainId: ChainId) => {
    const adapter = evmAdapters[chainId]
    if (!adapter) throw new Error(`No EVM chain adapter registered for ${chainId}`)
    return adapter
  },
  assertGetUtxoChainAdapter: (chainId: ChainId) => {
    const adapter = utxoAdapters[chainId]
    if (!adapter) throw new Error(`No UTXO chain adapter registered for ${chainId}`)
    return adapter
  },
  assertGetCosmosSdkChainAdapter: (chainId: ChainId) => {
    const adapter = cosmosSdkAdapters[chainId]
    if (!adapter) throw new Error(`No CosmosSdk chain adapter registered for ${chainId}`)
    return adapter
  },
  assertGetSolanaChainAdapter: () => solanaAdapter,
  assertGetTronChainAdapter: () => tronAdapter,
  assertGetSuiChainAdapter: () => suiAdapter,
  assertGetNearChainAdapter: () => nearAdapter,
  assertGetStarknetChainAdapter: () => starknetAdapter,
  assertGetTonChainAdapter: () => tonAdapter,
  fetchIsSmartContractAddressQuery: () => Promise.resolve(false),
})
