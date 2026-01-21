import {
  arbitrum,
  arbitrumNova,
  avalanche,
  base,
  bsc,
  gnosis,
  mainnet,
  optimism,
  polygon,
} from '@reown/appkit/networks'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import type { Config } from 'wagmi'

export const SUPPORTED_CHAINS = [
  mainnet,
  polygon,
  arbitrum,
  arbitrumNova,
  optimism,
  base,
  avalanche,
  bsc,
  gnosis,
] as const

export type SupportedChains = typeof SUPPORTED_CHAINS
export type SupportedChainId = SupportedChains[number]['id']

export type WagmiConfig = Config

let wagmiAdapterInstance: WagmiAdapter | null = null

export const createWagmiAdapter = (projectId: string): WagmiAdapter => {
  if (!wagmiAdapterInstance) {
    wagmiAdapterInstance = new WagmiAdapter({
      networks: [...SUPPORTED_CHAINS],
      projectId,
    })
  }
  return wagmiAdapterInstance
}

export const getWagmiAdapter = (): WagmiAdapter | null => wagmiAdapterInstance
