import type { ChainId } from '@shapeshiftoss/caip'
import * as adapters from '@shapeshiftoss/chain-adapters'
import type { SwapperDeps } from '@shapeshiftoss/swapper'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'

import { getAssetsById } from './assets'
import { getServerConfig } from './config'
import { env } from './env'

// ws is required by chain-adapter constructors but the public-api never
// subscribes to txs, so the URL is never dialed.
const wsPlaceholderUrl = 'ws://localhost'

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
}

const notImplemented = (type: string) => () => {
  throw new Error(`Chain adapter ${type} not implemented in public API`)
}

export const getSwapperDeps = (): SwapperDeps => ({
  assetsById: getAssetsById(),
  config: getServerConfig(),
  mixPanel: undefined,
  assertGetChainAdapter: (chainId: ChainId) => {
    const adapter = evmAdapters[chainId] ?? utxoAdapters[chainId]
    if (!adapter) throw new Error(`No chain adapter registered for ${chainId}`)
    return adapter as unknown as adapters.ChainAdapter<KnownChainIds>
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
  assertGetCosmosSdkChainAdapter: notImplemented('CosmosSdk') as unknown as (
    chainId: ChainId,
  ) => adapters.CosmosSdkChainAdapter,
  assertGetSolanaChainAdapter: notImplemented('Solana') as unknown as (
    chainId: ChainId,
  ) => adapters.solana.ChainAdapter,
  assertGetTronChainAdapter: notImplemented('Tron') as unknown as (
    chainId: ChainId,
  ) => adapters.tron.ChainAdapter,
  assertGetSuiChainAdapter: notImplemented('Sui') as unknown as (
    chainId: ChainId,
  ) => adapters.sui.ChainAdapter,
  assertGetNearChainAdapter: notImplemented('Near') as unknown as (
    chainId: ChainId,
  ) => adapters.near.ChainAdapter,
  assertGetStarknetChainAdapter: notImplemented('Starknet') as unknown as (
    chainId: ChainId,
  ) => adapters.starknet.ChainAdapter,
  assertGetTonChainAdapter: notImplemented('Ton') as unknown as (
    chainId: ChainId,
  ) => adapters.ton.ChainAdapter,
  fetchIsSmartContractAddressQuery: () => Promise.resolve(false),
})
