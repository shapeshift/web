import type { ChainId } from '@shapeshiftoss/caip'
import type {
  ChainAdapter,
  CosmosSdkChainAdapter,
  EvmChainAdapter,
  near,
  solana,
  starknet,
  sui,
  ton,
  tron,
  UtxoChainAdapter,
} from '@shapeshiftoss/chain-adapters'
import type { SwapperDeps } from '@shapeshiftoss/swapper'
import type { AssetsByIdPartial } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'

import { getServerConfig } from './config'

type GasFeeData = {
  gasPrice: string
  maxFeePerGas?: string
  maxPriorityFeePerGas?: string
}

type GasFeeDataEstimate = {
  fast: GasFeeData
  average: GasFeeData
  slow: GasFeeData
}

type UtxoNetworkFees = {
  fast: { satsPerKiloByte: number }
  average: { satsPerKiloByte: number }
  slow: { satsPerKiloByte: number }
}

const getEvmUnchainedUrls = (): Record<string, string> => {
  const config = getServerConfig()
  return {
    [KnownChainIds.EthereumMainnet]: config.VITE_UNCHAINED_ETHEREUM_HTTP_URL,
    [KnownChainIds.ArbitrumMainnet]:
      process.env.UNCHAINED_ARBITRUM_HTTP_URL || 'https://api.arbitrum.shapeshift.com',
    [KnownChainIds.OptimismMainnet]:
      process.env.UNCHAINED_OPTIMISM_HTTP_URL || 'https://api.optimism.shapeshift.com',
    [KnownChainIds.PolygonMainnet]:
      process.env.UNCHAINED_POLYGON_HTTP_URL || 'https://api.polygon.shapeshift.com',
    [KnownChainIds.GnosisMainnet]:
      process.env.UNCHAINED_GNOSIS_HTTP_URL || 'https://api.gnosis.shapeshift.com',
    [KnownChainIds.AvalancheMainnet]: config.VITE_UNCHAINED_AVALANCHE_HTTP_URL,
    [KnownChainIds.BnbSmartChainMainnet]: config.VITE_UNCHAINED_BNBSMARTCHAIN_HTTP_URL,
    [KnownChainIds.BaseMainnet]: config.VITE_UNCHAINED_BASE_HTTP_URL,
    [KnownChainIds.ArbitrumNovaMainnet]:
      process.env.UNCHAINED_ARBITRUM_NOVA_HTTP_URL || 'https://api.arbitrum-nova.shapeshift.com',
  }
}

const getUtxoUnchainedUrls = (): Record<string, string> => {
  const config = getServerConfig()
  return {
    [KnownChainIds.BitcoinMainnet]: config.VITE_UNCHAINED_BITCOIN_HTTP_URL,
    [KnownChainIds.DogecoinMainnet]: config.VITE_UNCHAINED_DOGECOIN_HTTP_URL,
    [KnownChainIds.LitecoinMainnet]: config.VITE_UNCHAINED_LITECOIN_HTTP_URL,
    [KnownChainIds.BitcoinCashMainnet]: config.VITE_UNCHAINED_BITCOINCASH_HTTP_URL,
  }
}

const GAS_FEES_TIMEOUT_MS = 10_000

const fetchGasFees = async (unchainedUrl: string): Promise<GasFeeDataEstimate> => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), GAS_FEES_TIMEOUT_MS)

  try {
    const response = await fetch(`${unchainedUrl}/api/v1/gas/fees`, {
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new Error(`Failed to fetch gas fees: ${response.statusText}`)
    }
    const data = (await response.json()) as GasFeeDataEstimate
    return {
      fast: {
        gasPrice: data.fast.gasPrice,
        maxFeePerGas: data.fast.maxFeePerGas,
        maxPriorityFeePerGas: data.fast.maxPriorityFeePerGas,
      },
      average: {
        gasPrice: data.average.gasPrice,
        maxFeePerGas: data.average.maxFeePerGas,
        maxPriorityFeePerGas: data.average.maxPriorityFeePerGas,
      },
      slow: {
        gasPrice: data.slow.gasPrice,
        maxFeePerGas: data.slow.maxFeePerGas,
        maxPriorityFeePerGas: data.slow.maxPriorityFeePerGas,
      },
    }
  } finally {
    clearTimeout(timeout)
  }
}

const createMinimalEvmAdapter = (chainId: ChainId) => {
  const evmUnchainedUrls = getEvmUnchainedUrls()
  const unchainedUrl = evmUnchainedUrls[chainId]
  if (!unchainedUrl) {
    throw new Error(`No Unchained URL configured for chain ${chainId}`)
  }

  return {
    getChainId: () => chainId,
    getGasFeeData: () => fetchGasFees(unchainedUrl),
    getFeeAssetId: () => {
      switch (chainId) {
        case KnownChainIds.EthereumMainnet:
          return 'eip155:1/slip44:60'
        case KnownChainIds.ArbitrumMainnet:
          return 'eip155:42161/slip44:60'
        case KnownChainIds.OptimismMainnet:
          return 'eip155:10/slip44:60'
        case KnownChainIds.PolygonMainnet:
          return 'eip155:137/slip44:966'
        case KnownChainIds.GnosisMainnet:
          return 'eip155:100/slip44:700'
        case KnownChainIds.AvalancheMainnet:
          return 'eip155:43114/slip44:9005'
        case KnownChainIds.BnbSmartChainMainnet:
          return 'eip155:56/slip44:714'
        case KnownChainIds.BaseMainnet:
          return 'eip155:8453/slip44:60'
        case KnownChainIds.ArbitrumNovaMainnet:
          return 'eip155:42170/slip44:60'
        default:
          return `${chainId}/slip44:60`
      }
    },
    getDisplayName: () => chainId,
  }
}

const createMinimalUtxoAdapter = (chainId: ChainId) => {
  const utxoUnchainedUrls = getUtxoUnchainedUrls()
  const unchainedUrl = utxoUnchainedUrls[chainId]
  if (!unchainedUrl) {
    throw new Error(`No Unchained URL configured for UTXO chain ${chainId}`)
  }

  const getFeeAssetId = () => {
    switch (chainId) {
      case KnownChainIds.BitcoinMainnet:
        return 'bip122:000000000019d6689c085ae165831e93/slip44:0'
      case KnownChainIds.DogecoinMainnet:
        return 'bip122:00000000001a91e3dace36e2be3bf030/slip44:3'
      case KnownChainIds.LitecoinMainnet:
        return 'bip122:12a765e31ffd4059bada1e25190f6e98/slip44:2'
      case KnownChainIds.BitcoinCashMainnet:
        return 'bip122:000000000000000000651ef99cb9fcbe/slip44:145'
      default:
        throw new Error(`Unknown UTXO chain ${chainId}`)
    }
  }

  const getDisplayName = () => {
    switch (chainId) {
      case KnownChainIds.BitcoinMainnet:
        return 'Bitcoin'
      case KnownChainIds.DogecoinMainnet:
        return 'Dogecoin'
      case KnownChainIds.LitecoinMainnet:
        return 'Litecoin'
      case KnownChainIds.BitcoinCashMainnet:
        return 'Bitcoin Cash'
      default:
        return chainId
    }
  }

  return {
    getChainId: () => chainId,
    getFeeAssetId,
    getDisplayName,
    getFeeData: async (_input: {
      to: string
      value: string
      chainSpecific: { pubkey: string; opReturnData?: string }
    }) => {
      const response = await fetch(`${unchainedUrl}/api/v1/fees`)
      if (!response.ok) {
        throw new Error(`Failed to fetch UTXO fees: ${response.statusText}`)
      }
      const networkFees = (await response.json()) as UtxoNetworkFees

      const fastPerByte = String(Math.round(networkFees.fast.satsPerKiloByte / 1000))
      const averagePerByte = String(Math.round(networkFees.average.satsPerKiloByte / 1000))
      const slowPerByte = String(Math.round(networkFees.slow.satsPerKiloByte / 1000))

      const ESTIMATED_TX_SIZE = 250
      const fastFee = String(parseInt(fastPerByte) * ESTIMATED_TX_SIZE)
      const averageFee = String(parseInt(averagePerByte) * ESTIMATED_TX_SIZE)
      const slowFee = String(parseInt(slowPerByte) * ESTIMATED_TX_SIZE)

      return {
        fast: {
          txFee: fastFee,
          chainSpecific: { satoshiPerByte: fastPerByte },
        },
        average: {
          txFee: averageFee,
          chainSpecific: { satoshiPerByte: averagePerByte },
        },
        slow: {
          txFee: slowFee,
          chainSpecific: { satoshiPerByte: slowPerByte },
        },
      }
    },
  }
}

const createStubAdapter = (type: string) => {
  return () => {
    throw new Error(
      `Chain adapter ${type} not implemented in public API. ` +
        `This swapper requires chain adapter functionality that is not yet available.`,
    )
  }
}

export const createServerSwapperDeps = (assetsById: AssetsByIdPartial): SwapperDeps => ({
  assetsById,
  config: getServerConfig(),
  mixPanel: undefined,

  assertGetChainAdapter: createStubAdapter('generic') as unknown as (
    chainId: ChainId,
  ) => ChainAdapter<KnownChainIds>,

  assertGetEvmChainAdapter: ((chainId: ChainId) => {
    const evmUnchainedUrls = getEvmUnchainedUrls()
    const unchainedUrl = evmUnchainedUrls[chainId]
    if (unchainedUrl) {
      return createMinimalEvmAdapter(chainId)
    }
    throw new Error(`Chain adapter EVM for ${chainId} not implemented in public API.`)
  }) as unknown as (chainId: ChainId) => EvmChainAdapter,

  assertGetUtxoChainAdapter: ((chainId: ChainId) => {
    const utxoUnchainedUrls = getUtxoUnchainedUrls()
    const unchainedUrl = utxoUnchainedUrls[chainId]
    if (unchainedUrl) {
      return createMinimalUtxoAdapter(chainId)
    }
    throw new Error(`Chain adapter UTXO for ${chainId} not implemented in public API.`)
  }) as unknown as (chainId: ChainId) => UtxoChainAdapter,

  assertGetCosmosSdkChainAdapter: createStubAdapter('CosmosSdk') as unknown as (
    chainId: ChainId,
  ) => CosmosSdkChainAdapter,
  assertGetSolanaChainAdapter: createStubAdapter('Solana') as unknown as (
    chainId: ChainId,
  ) => solana.ChainAdapter,
  assertGetTronChainAdapter: createStubAdapter('Tron') as unknown as (
    chainId: ChainId,
  ) => tron.ChainAdapter,
  assertGetSuiChainAdapter: createStubAdapter('Sui') as unknown as (
    chainId: ChainId,
  ) => sui.ChainAdapter,
  assertGetNearChainAdapter: createStubAdapter('Near') as unknown as (
    chainId: ChainId,
  ) => near.ChainAdapter,
  assertGetStarknetChainAdapter: createStubAdapter('Starknet') as unknown as (
    chainId: ChainId,
  ) => starknet.ChainAdapter,
  assertGetTonChainAdapter: createStubAdapter('Ton') as unknown as (
    chainId: ChainId,
  ) => ton.ChainAdapter,

  fetchIsSmartContractAddressQuery: () => Promise.resolve(false),
})
