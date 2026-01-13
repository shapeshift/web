import type { Chain } from 'viem'
import { defineChain } from 'viem'
import * as viemChains from 'viem/chains'

import type { EvmChainConfig } from './types'

const TRUSTWALLET_ASSETS_BASE_URL =
  'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains'

const LLAMAO_ICONS_BASE_URL = 'https://icons.llamao.fi/icons/chains/rsz_'

// Custom chain definitions for chains not in viem
// Data sourced from chainlist.org
const goldChain = defineChain({
  id: 4653,
  name: 'Gold Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://chain-rpc.gold.dev'] },
  },
  blockExplorers: {
    default: { name: 'Gold Explorer', url: 'https://explorer.gold.dev' },
  },
})

const hypraMainnet = defineChain({
  id: 622277,
  name: 'Hypra Mainnet',
  nativeCurrency: { name: 'Hypra', symbol: 'HYP', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.hypra.network'] },
  },
  blockExplorers: {
    default: {
      name: 'Hypra Explorer',
      url: 'https://explorer.hypra.network',
    },
  },
})

const proofOfPlayApex = defineChain({
  id: 70700,
  name: 'Proof of Play - Apex',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.apex.proofofplay.com'] },
  },
  blockExplorers: {
    default: {
      name: 'Proof of Play Apex Explorer',
      url: 'https://explorer.apex.proofofplay.com',
    },
  },
})

// Custom chains map for chains not available in viem
const customChains = new Map<number, Chain>([
  [4653, goldChain],
  [622277, hypraMainnet],
  [70700, proofOfPlayApex],
])

const viemChainById = new Map<number, Chain>()
Object.values(viemChains).forEach(chain => {
  if (chain && typeof chain === 'object' && 'id' in chain) {
    viemChainById.set(chain.id, chain as Chain)
  }
})

// Merge custom chains into the map
customChains.forEach((chain, id) => {
  if (!viemChainById.has(id)) {
    viemChainById.set(id, chain)
  }
})

const TRUSTWALLET_CHAIN_SLUGS: Record<number, string> = {
  1: 'ethereum',
  10: 'optimism',
  56: 'smartchain',
  100: 'xdai',
  137: 'polygon',
  250: 'fantom',
  324: 'zksync',
  8453: 'base',
  42161: 'arbitrum',
  42170: 'arb-nova',
  43114: 'avalanchec',
  59144: 'linea',
  81457: 'blast',
  534352: 'scroll',
  7777777: 'zora',
}

const LLAMAO_CHAIN_SLUGS: Record<number, string> = {
  1: 'ethereum',
  10: 'optimism',
  56: 'binance',
  100: 'xdai',
  137: 'polygon',
  146: 'sonic',
  250: 'fantom',
  252: 'fraxtal',
  324: 'zksync',
  360: 'shape',
  480: 'worldchain',
  690: 'redstone',
  747: 'flow',
  1101: 'polygon_zkevm',
  1135: 'lisk',
  1329: 'sei',
  1750: 'metal',
  1868: 'soneium',
  2741: 'abstract',
  4653: 'gold',
  5000: 'mantle',
  5112: 'ham',
  7560: 'cyber',
  7777777: 'zora',
  8333: 'b3',
  8453: 'base',
  17069: 'garnet',
  33139: 'apechain',
  34443: 'mode',
  42161: 'arbitrum',
  42170: 'arb_nova',
  42220: 'celo',
  43114: 'avalanche',
  48900: 'zircuit',
  57073: 'ink',
  59144: 'linea',
  60808: 'bob',
  80084: 'berachain',
  81457: 'blast',
  111188: 'real',
  167000: 'taiko',
  200901: 'bitlayer',
  534352: 'scroll',
  543210: 'zero',
  622277: 'hypra',
  660279: 'xai',
  810180: 'zklink',
  984122: 'forma',
  7225878: 'saakuru',
  70700: 'apex',
}

export const getChainIconUrl = (chainId: number): string | undefined => {
  const trustwalletSlug = TRUSTWALLET_CHAIN_SLUGS[chainId]
  if (trustwalletSlug) {
    return `${TRUSTWALLET_ASSETS_BASE_URL}/${trustwalletSlug}/info/logo.png`
  }

  const llamaoSlug = LLAMAO_CHAIN_SLUGS[chainId]
  if (llamaoSlug) {
    return `${LLAMAO_ICONS_BASE_URL}${llamaoSlug}.jpg`
  }

  return undefined
}

export const getViemChain = (chainId: number): Chain | undefined => {
  return viemChainById.get(chainId)
}

export const createEvmChainConfig = (chainId: number): EvmChainConfig | undefined => {
  const viemChain = getViemChain(chainId)
  if (!viemChain) return undefined

  const defaultRpcUrl = viemChain.rpcUrls.default?.http?.[0]
  const explorer = viemChain.blockExplorers?.default

  return {
    chainId: viemChain.id,
    name: viemChain.name,
    displayName: viemChain.name,
    nativeCurrency: {
      name: viemChain.nativeCurrency.name,
      symbol: viemChain.nativeCurrency.symbol,
      decimals: viemChain.nativeCurrency.decimals,
    },
    rpcUrls: defaultRpcUrl ? [defaultRpcUrl] : [],
    blockExplorerUrl: explorer?.url ?? '',
    blockExplorerApiUrl: explorer?.apiUrl,
    iconUrl: getChainIconUrl(chainId),
    multicall3Address: viemChain.contracts?.multicall3?.address as `0x${string}` | undefined,
    isTestnet: viemChain.testnet ?? false,
    viemChain,
  }
}

export const RELAY_SUPPORTED_CHAIN_IDS = [
  1, 10, 56, 100, 137, 250, 324, 747, 1329, 8453, 42161, 42170, 42220, 43114, 59144, 81457, 534352,
  7777777,
] as const

export type RelaySupportedChainId = (typeof RELAY_SUPPORTED_CHAIN_IDS)[number]

export const isRelaySupportedChain = (chainId: number): chainId is RelaySupportedChainId => {
  return (RELAY_SUPPORTED_CHAIN_IDS as readonly number[]).includes(chainId)
}

const evmChainRegistry = new Map<number, EvmChainConfig>()

export const getEvmChainConfig = (chainId: number): EvmChainConfig | undefined => {
  const cached = evmChainRegistry.get(chainId)
  if (cached) return cached

  const config = createEvmChainConfig(chainId)
  if (config) {
    evmChainRegistry.set(chainId, config)
  }
  return config
}

export const getEvmChainConfigs = (chainIds: readonly number[]): Map<number, EvmChainConfig> => {
  const result = new Map<number, EvmChainConfig>()
  for (const chainId of chainIds) {
    const config = getEvmChainConfig(chainId)
    if (config) {
      result.set(chainId, config)
    }
  }
  return result
}

export const getAllRelaySupportedChainConfigs = (): Map<number, EvmChainConfig> => {
  return getEvmChainConfigs(RELAY_SUPPORTED_CHAIN_IDS)
}

export const getSupportedViemChainIds = (): number[] => {
  return Array.from(viemChainById.keys())
}

export const hasViemChain = (chainId: number): boolean => {
  return viemChainById.has(chainId)
}
