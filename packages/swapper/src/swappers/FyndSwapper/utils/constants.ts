import { KnownChainIds } from '@shapeshiftoss/types'
import type { Address } from 'viem'

// Fynd Router Registry: https://docs.propellerheads.xyz/tycho/for-solvers/execution/contract-addresses
export const FYND_CHAINS = {
  [KnownChainIds.EthereumMainnet]: {
    name: 'ethereum',
    routerAddress: '0x1644d2477f809cc2c71bccfd6dc9497e3f83210d',
  },
  [KnownChainIds.BaseMainnet]: {
    name: 'base',
    routerAddress: '0xaba5b53b03eafad1c5fc8bd5fc765fc85bb3de67',
  },
  [KnownChainIds.ArbitrumMainnet]: {
    name: 'arbitrum',
    routerAddress: '0x924f147c50ea59f5180a26031a8b65b2aa1e81cd',
  },
  [KnownChainIds.BnbSmartChainMainnet]: {
    name: 'bsc',
    routerAddress: '0x7f3d12bbafb8955e51b3ab9588b34c8ad95bda4e',
  },
  [KnownChainIds.PolygonMainnet]: {
    name: 'polygon',
    routerAddress: '0xbd4e6011f03355c2a377fd9af939322a7d0a1bc1',
  },
  [KnownChainIds.UnichainMainnet]: {
    name: 'unichain',
    routerAddress: '0xcba5574597ad00ea250fd106dab4fc7461949635',
  },
  [KnownChainIds.RobinhoodMainnet]: {
    name: 'robinhood',
    routerAddress: '0x09215a470bd585e59eb3f4b612fbd2678131ff9e',
  },
} as const satisfies Record<string, { name: string; routerAddress: Address }>

export type FyndSupportedChainId = keyof typeof FYND_CHAINS
export const FYND_RATE_ADDRESS = '0x0000000000000000000000000000000000000001' as Address
