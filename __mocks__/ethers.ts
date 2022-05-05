/* eslint-disable @typescript-eslint/no-explicit-any */
const ethers = {
  ...jest.requireActual('ethers').ethers,
  providers: {
    JsonRpcProvider: jest.fn()
  },
  Contract: jest.fn().mockImplementation((address) => ({
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
    }
  }))
}

// extra mocks for hdwallet which uses explicit imports instead of the standard `import { ethers } from 'ethers'`
const BigNumber = jest.requireActual('ethers').BigNumber
const Bytes = jest.requireActual('ethers').Bytes
const BytesLike = jest.requireActual('ethers').BytesLike
const Signature = jest.requireActual('ethers').Signature
const Signer = jest.requireActual('ethers').Signer
const UnsignedTransaction = jest.requireActual('ethers').UnsignedTransaction
const providers = jest.requireActual('ethers').providers
const utils = jest.requireActual('ethers').utils

export {
  ethers,
  BigNumber,
  Bytes,
  BytesLike,
  Signature,
  Signer,
  UnsignedTransaction,
  providers,
  utils
}
