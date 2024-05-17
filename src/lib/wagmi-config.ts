import {
  arbitrum,
  arbitrumNova,
  avalanche,
  bsc,
  gnosis,
  mainnet,
  optimism,
  polygon,
} from 'viem/chains'
import { createConfig } from 'wagmi'

import { viemClientByNetworkId } from './viem-client'

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig
  }
}

export const wagmiConfig = createConfig({
  chains: [mainnet, bsc, avalanche, arbitrum, optimism, arbitrumNova, gnosis, polygon],
  // @ts-ignore wagmi is drunk https://github.com/wevm/viem/blob/12d9244c6c6f77ecda30f9014b383e5500e7bff9/src/types/chain.ts#L25
  client({ chain }) {
    return viemClientByNetworkId[chain.id]!
  },
})
