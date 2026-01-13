import type { Chain } from 'viem'

export type EvmChainConfig = {
  chainId: number
  name: string
  displayName: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
  rpcUrls: string[]
  blockExplorerUrl: string
  blockExplorerApiUrl?: string
  iconUrl?: string
  multicall3Address?: `0x${string}`
  isTestnet?: boolean
  viemChain?: Chain
}

export type ChainIconSource = 'trustwallet' | 'coingecko' | 'custom'
