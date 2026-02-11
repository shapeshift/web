import {
  arbitrum,
  avalanche,
  base,
  bsc,
  gnosis,
  mainnet,
  optimism,
  polygon,
} from '@reown/appkit/networks'
import type { Config } from 'wagmi'

export const SUPPORTED_CHAINS = [
  mainnet,
  polygon,
  arbitrum,
  optimism,
  base,
  avalanche,
  bsc,
  gnosis,
] as const

export type SupportedChains = typeof SUPPORTED_CHAINS
export type SupportedChainId = SupportedChains[number]['id']

export type WagmiConfig = Config
