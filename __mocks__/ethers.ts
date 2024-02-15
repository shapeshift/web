import ethers from 'ethers'
import { vi } from 'vitest'

const ethersMock = {
  ...ethers,
  providers: {
    JsonRpcProvider: vi.fn(),
  },
  Contract: vi.fn().mockImplementation(address => ({
    decimals: () => {
      switch (address as string) {
        case '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48':
          return 6
        case '0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d':
          return 18
        case '0x470e8de2eBaef52014A47Cb5E6aF86884947F08c':
          return 18
        case '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2':
          return 18
        default:
          throw new Error(`no decimals mock for address: ${address}`)
      }
    },
    name: () => {
      switch (address as string) {
        case '0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d':
          return 'FOX'
        case '0x470e8de2eBaef52014A47Cb5E6aF86884947F08c':
          return 'Uniswap V2'
        case '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2':
          return 'Wrapped Ether'
        default:
          throw new Error(`no decimals mock for address: ${address}`)
      }
    },
    symbol: () => {
      switch (address as string) {
        case '0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d':
          return 'FOX'
        case '0x470e8de2eBaef52014A47Cb5E6aF86884947F08c':
          return 'UNI-V2'
        case '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2':
          return 'WETH'
        default:
          throw new Error(`no decimals mock for address: ${address}`)
      }
    },
  })),
}

export { ethersMock as ethers }
