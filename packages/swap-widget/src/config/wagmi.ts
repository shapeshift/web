import type { AppKitNetwork } from '@reown/appkit/networks'
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

export const SUPPORTED_CHAINS: readonly AppKitNetwork[] = [
  mainnet,
  polygon,
  arbitrum,
  optimism,
  base,
  avalanche,
  bsc,
  gnosis,
]

export type SupportedChains = typeof SUPPORTED_CHAINS
export type SupportedChainId = number

export type WagmiConfig = Config
