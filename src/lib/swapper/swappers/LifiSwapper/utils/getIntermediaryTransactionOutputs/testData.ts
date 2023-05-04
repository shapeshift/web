import type { CrossStep, Estimate, LifiStep, Route, SwapStep } from '@lifi/types'

export const emptyLifiRoute: Route = {
  steps: [],
} as unknown as Route

export const singleStepLifiRoute: Route = {
  steps: [
    {
      id: '0181a146-5f19-4ed6-b675-210eb5008755',
      type: 'cross',
      action: {
        fromChainId: 1,
        fromAmount: '120527596',
        fromToken: {
          address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          chainId: 1,
          symbol: 'USDC',
          decimals: 6,
          name: 'USD Coin',
          priceUSD: '0.9998',
        },
        toChainId: 10,
        toToken: {
          address: '0x7f5c764cbc14f9669b88837ca1490cca17c31607',
          chainId: 10,
          symbol: 'USDC',
          decimals: 6,
          name: 'USD Coin',
          priceUSD: '0.9997',
        },
        slippage: 0.002,
        destinationGasConsumption: '614270',
      },
      estimate: {
        fromAmount: '120769134',
        toAmount: '120811010',
        toAmountMin: '120328249',
        approvalAddress: '0x6fd84ba95525c4ccd218f2f16f646a08b4b0a598',
        executionDuration: 180,
      } as Estimate,
    } as unknown as CrossStep,
  ],
} as unknown as Route

export const multiStepLifiRoute: Route = {
  steps: [
    {
      type: 'lifi',
      includedSteps: [
        {
          id: 'a1b49d14-33eb-4d21-8e79-28925185d536',
          type: 'swap',
          action: {
            fromChainId: 1,
            fromAmount: '63411205816921280',
            fromToken: {
              address: '0x0000000000000000000000000000000000000000',
              chainId: 1,
              symbol: 'ETH',
              decimals: 18,
              name: 'ETH',
              priceUSD: '1892.41',
            },
            toChainId: 1,
            toToken: {
              address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
              chainId: 1,
              symbol: 'USDC',
              decimals: 6,
              name: 'USD Coin',
              priceUSD: '0.9998',
            },
            slippage: 0.002,
          },
          estimate: {
            fromAmount: '63411205816921280',
            toAmount: '120769134',
            toAmountMin: '120527596',
            approvalAddress: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
            executionDuration: 30,
          } as Estimate,
        } as SwapStep,
        {
          id: '0181a146-5f19-4ed6-b675-210eb5008755',
          type: 'cross',
          action: {
            fromChainId: 1,
            fromAmount: '120527596',
            fromToken: {
              address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
              chainId: 1,
              symbol: 'USDC',
              decimals: 6,
              name: 'USD Coin',
              priceUSD: '0.9998',
            },
            toChainId: 10,
            toToken: {
              address: '0x7f5c764cbc14f9669b88837ca1490cca17c31607',
              chainId: 10,
              symbol: 'USDC',
              decimals: 6,
              name: 'USD Coin',
              priceUSD: '0.9997',
            },
            slippage: 0.002,
            destinationGasConsumption: '614270',
          },
          estimate: {
            fromAmount: '120769134',
            toAmount: '120811010',
            toAmountMin: '120328249',
            approvalAddress: '0x6fd84ba95525c4ccd218f2f16f646a08b4b0a598',
            executionDuration: 180,
          } as Estimate,
        } as unknown as CrossStep,
        {
          id: '23cbc26c-6d83-4330-94a2-5f736a3b339d',
          type: 'swap',
          action: {
            fromChainId: 10,
            fromAmount: '120328249',
            fromToken: {
              address: '0x7f5c764cbc14f9669b88837ca1490cca17c31607',
              chainId: 10,
              symbol: 'USDC',
              decimals: 6,
              name: 'USD Coin',
              priceUSD: '0.9997',
            },
            toChainId: 10,
            toToken: {
              address: '0x9c9e5fd8bbc25984b178fdce6117defa39d2db39',
              chainId: 10,
              symbol: 'BUSD',
              decimals: 18,
              name: 'BUSD',
              priceUSD: '1.0009135674190537',
            },
            slippage: 0.002,
          },
          estimate: {
            fromAmount: '120328249',
            toAmount: '120236713455507352509',
            toAmountMin: '119996240028596337804',
            approvalAddress: '0xdef1abe32c034e558cdd535791643c58a13acc10',
            executionDuration: 30,
          } as Estimate,
        } as SwapStep,
      ],
    } as LifiStep,
  ],
} as Route
