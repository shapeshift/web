import type { BridgeDefinition, CrossStep, LifiStep, SwapStep, Token as LifiToken } from '@lifi/sdk'
import { ChainId as LifiChainId } from '@lifi/types'
import { bn } from 'lib/bignumber/bignumber'

import { getMinimumUsdHumanFromStep } from './getMinimumUsdHumanFromStep'

describe('getMinimumUsdHumanFromStep', () => {
  const ethTokenAddress = '0x0000000000000000000000000000000000000000'
  const usdcTokenAddress = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
  const optTokenAddress = '0x4200000000000000000000000000000000000042'
  const maticTokenAddress = '0xa56b1b9f4e5a1a1e0868f5fd4352ce7cdf0c2a4f'

  const ethOnEthereum: LifiToken = {
    address: ethTokenAddress,
    symbol: 'ETH',
    decimals: 18,
    chainId: LifiChainId.ETH,
    name: 'Ethereum',
    priceUSD: '1931.74',
  }

  const usdcOnEthereum: LifiToken = {
    address: usdcTokenAddress,
    symbol: 'USDC',
    decimals: 6,
    chainId: LifiChainId.ETH,
    name: 'USD Coin',
    priceUSD: '1.00',
  }

  const usdcOnOptimism: LifiToken = {
    address: usdcTokenAddress,
    symbol: 'USDC',
    decimals: 6,
    chainId: LifiChainId.OPT,
    name: 'USD Coin',
    priceUSD: '1.00',
  }

  const opOnOptimism: LifiToken = {
    address: optTokenAddress,
    symbol: 'OP',
    decimals: 18,
    chainId: LifiChainId.OPT,
    name: 'Optimism',
    priceUSD: '2.30',
  }

  const opOnAvalanche: LifiToken = {
    address: optTokenAddress,
    symbol: 'OP',
    decimals: 18,
    chainId: LifiChainId.AVA,
    name: 'Optimism',
    priceUSD: '2.30',
  }

  const maticOnAvalanche: LifiToken = {
    address: maticTokenAddress,
    symbol: 'MATIC',
    decimals: 19,
    chainId: LifiChainId.AVA,
    name: '1.10',
  }

  const stargateBridge = {
    fromToken: usdcOnEthereum,
    toToken: usdcOnOptimism,
    fromChainId: LifiChainId.ETH,
    toChainId: LifiChainId.OPT,
    tool: 'stargate',
    minimumTransfer: '100000', // 0.10 USDC
    maximumTransfer: '',
    swapFeeRate: '',
    swapFeeMinimum: '',
    swapFeeMaximum: '',
  } as BridgeDefinition

  const multichainBridge = {
    fromToken: opOnOptimism,
    toToken: opOnAvalanche,
    fromChainId: LifiChainId.OPT,
    toChainId: LifiChainId.AVA,
    tool: 'multichain',
    minimumTransfer: '20000000000000000', // 0.02 OP
    maximumTransfer: '',
    swapFeeRate: '',
    swapFeeMinimum: '',
    swapFeeMaximum: '',
  } as BridgeDefinition

  const mockBridges: BridgeDefinition[] = [stargateBridge, multichainBridge]

  test('returns minimum amount for a single-hop LifiStep', () => {
    const mockLifiStep: LifiStep = {
      type: 'lifi',
      tool: 'stargate',
      action: {
        fromToken: ethOnEthereum,
        toToken: opOnOptimism,
        fromChainId: LifiChainId.ETH,
        toChainId: LifiChainId.OPT,
      },
      includedSteps: [
        {
          type: 'swap',
          tool: '1inch',
          action: {
            fromToken: ethOnEthereum,
            toToken: usdcOnEthereum,
            fromChainId: LifiChainId.ETH,
            toChainId: LifiChainId.ETH,
          },
        } as SwapStep,
        {
          type: 'cross',
          tool: 'stargate',
          action: {
            fromToken: usdcOnEthereum,
            toToken: usdcOnOptimism,
            fromChainId: LifiChainId.ETH,
            toChainId: LifiChainId.OPT,
          },
        } as CrossStep,
        {
          type: 'swap',
          tool: '1inch',
          action: {
            fromToken: usdcOnOptimism,
            toToken: opOnOptimism,
            fromChainId: LifiChainId.OPT,
            toChainId: LifiChainId.OPT,
          },
        } as SwapStep,
      ],
    } as LifiStep

    const result = getMinimumUsdHumanFromStep(mockLifiStep, mockBridges)
    expect(result).toEqual(bn((100000 / 1e6) * 1.0)) // 0.10 USDC -> 0.1 USD
  })

  test('returns minimum amount for a CrossStep with a matching bridge', () => {
    const step: CrossStep = {
      type: 'cross',
      tool: 'multichain',
      action: {
        fromToken: opOnOptimism,
        toToken: opOnAvalanche,
        fromChainId: LifiChainId.OPT,
        toChainId: LifiChainId.AVA,
      },
    } as CrossStep

    const result = getMinimumUsdHumanFromStep(step, mockBridges)
    expect(result).toEqual(bn((20000000000000000 / 1e18) * 2.3)) // 0.02 OP -> 0.046 USD
  })

  test('returns undefined for a CrossStep with no matching bridge', () => {
    const step: CrossStep = {
      type: 'cross',
      tool: 'multichain',
      action: {
        fromToken: usdcOnEthereum,
        toToken: usdcOnOptimism,
        fromChainId: LifiChainId.ETH,
        toChainId: LifiChainId.OPT,
      },
    } as CrossStep

    const result = getMinimumUsdHumanFromStep(step, mockBridges)
    expect(result).toBeUndefined()
  })

  // TODO: need to check the logic about bridge selection with tokens, do i need to use the lifi top level step data at all?

  test('returns undefined for a step with no CrossSteps', () => {
    const step: SwapStep = {
      type: 'swap',
      action: {
        fromToken: usdcOnEthereum,
        toToken: maticOnAvalanche,
        fromChainId: LifiChainId.ETH,
        toChainId: LifiChainId.AVA,
      },
    } as SwapStep

    const result = getMinimumUsdHumanFromStep(step, mockBridges)
    expect(result).toBeUndefined()
  })
})
