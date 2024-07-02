import type { LifiStepSubset, OtherStepSubset } from './types'

export const singleStepLifiRouteSteps: OtherStepSubset = {
  type: 'cross',
  action: {
    toToken: {
      address: '0x7f5c764cbc14f9669b88837ca1490cca17c31607',
      chainId: 10,
      symbol: 'USDC',
      decimals: 6,
      name: 'USD Coin',
      priceUSD: '0.9997',
    },
  },
  estimate: {
    toAmountMin: '120328249',
  },
}

export const multiStepLifiRouteSteps: LifiStepSubset = {
  type: 'lifi',
  includedSteps: [
    {
      type: 'swap',
      action: {
        toToken: {
          address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          chainId: 1,
          symbol: 'USDC',
          decimals: 6,
          name: 'USD Coin',
          priceUSD: '0.9998',
        },
      },
      estimate: {
        toAmountMin: '120527596',
      },
    },
    {
      type: 'cross',
      action: {
        toToken: {
          address: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
          chainId: 42161,
          symbol: 'USDC',
          decimals: 6,
          name: 'USD Coin',
          priceUSD: '0.9997',
        },
      },
      estimate: {
        toAmountMin: '120328249',
      },
    },
    {
      type: 'swap',
      action: {
        toToken: {
          address: '0x9c9e5fd8bbc25984b178fdce6117defa39d2db39',
          chainId: 42161,
          symbol: 'BUSD',
          decimals: 18,
          name: 'BUSD',
          priceUSD: '1.0009135674190537',
        },
      },
      estimate: {
        toAmountMin: '119996240028596337804',
      },
    },
  ],
}
