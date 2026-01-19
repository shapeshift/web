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

const EVM_UNCHAINED_URLS: Record<string, string> = {
  [KnownChainIds.EthereumMainnet]: 'https://api.ethereum.shapeshift.com',
  [KnownChainIds.ArbitrumMainnet]: 'https://api.arbitrum.shapeshift.com',
  [KnownChainIds.OptimismMainnet]: 'https://api.optimism.shapeshift.com',
  [KnownChainIds.PolygonMainnet]: 'https://api.polygon.shapeshift.com',
  [KnownChainIds.GnosisMainnet]: 'https://api.gnosis.shapeshift.com',
  [KnownChainIds.AvalancheMainnet]: 'https://api.avalanche.shapeshift.com',
  [KnownChainIds.BnbSmartChainMainnet]: 'https://api.bnbsmartchain.shapeshift.com',
  [KnownChainIds.BaseMainnet]: 'https://api.base.shapeshift.com',
  [KnownChainIds.ArbitrumNovaMainnet]: 'https://api.arbitrum-nova.shapeshift.com',
}

const fetchGasFees = async (unchainedUrl: string): Promise<GasFeeDataEstimate> => {
  const response = await fetch(`${unchainedUrl}/api/v1/gas/fees`)
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
}

const createMinimalEvmAdapter = (chainId: ChainId) => {
  const unchainedUrl = EVM_UNCHAINED_URLS[chainId]
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
    const unchainedUrl = EVM_UNCHAINED_URLS[chainId]
    if (unchainedUrl) {
      return createMinimalEvmAdapter(chainId)
    }
    throw new Error(`Chain adapter EVM for ${chainId} not implemented in public API.`)
  }) as unknown as (chainId: ChainId) => EvmChainAdapter,

  assertGetUtxoChainAdapter: createStubAdapter('UTXO') as unknown as (
    chainId: ChainId,
  ) => UtxoChainAdapter,
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
