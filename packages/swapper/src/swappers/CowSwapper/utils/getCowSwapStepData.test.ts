import type { OrderQuoteResponse } from '@shapeshiftoss/types'
import { describe, expect, it } from 'vitest'

import type { GetTradeQuoteInput, GetTradeRateInput, SwapperDeps } from '../../../types'
import { FOX_MAINNET } from '../../../utils/test-data/assets'
import type { GetCowSwapStepDataArgs } from './getCowSwapStepData'
import { getCowSwapStepData } from './getCowSwapStepData'

const cowswapQuoteResponse = {
  quote: {
    sellToken: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
    buyToken: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    receiver: '0x90a48d5cf7343b08da12e067680b4c6dbfe551be',
    sellAmount: '9755648144619063874259',
    buyAmount: '289305614806369753',
    validTo: 1712259433,
    appData:
      '{"appCode":"shapeshift","metadata":{"orderClass":{"orderClass":"market"},"quote":{"slippageBips":50}},"version":"1.3.0"}',
    appDataHash: '0x41fffc0127f56060cc551652721d84c336f87649a20c51fcff5b8841dfeabe5b',
    feeAmount: '184116879335769833472',
    kind: 'sell',
    partiallyFillable: false,
    sellTokenBalance: 'erc20',
    buyTokenBalance: 'erc20',
    signingScheme: 'eip712',
  },
  from: '0x90a48d5cf7343b08da12e067680b4c6dbfe551be',
  expiration: '2024-04-04T19:09:12.792412370Z',
  id: 474006349,
  verified: false,
} as unknown as OrderQuoteResponse

const commonArgs = {
  deps: {} as SwapperDeps,
  sellAsset: FOX_MAINNET,
  cowswapQuoteResponse,
  appDataHash: '0x41fffc0127f56060cc551652721d84c336f87649a20c51fcff5b8841dfeabe5b',
  // quoted buyAmount less 0.5% slippage, as returned by getValuesFromQuoteResponse
  buyAmountAfterFeesCryptoBaseUnit: '287859086732337904',
}

describe('getCowSwapStepData', () => {
  describe('quote', () => {
    it('should return the order to sign', () => {
      const args = {
        ...commonArgs,
        type: 'quote',
        input: {} as GetTradeQuoteInput,
        from: '0x90a48d5cf7343b08da12e067680b4c6dbfe551be',
      } satisfies Extract<GetCowSwapStepDataArgs, { type: 'quote' }>

      const actual = getCowSwapStepData(args).unwrap()

      expect(actual).toEqual({
        networkFeeCryptoBaseUnit: '0',
        transactionData: {
          type: 'cowswap',
          chainId: 'eip155:1',
          orderToSign: {
            sellToken: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
            buyToken: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
            receiver: '0x90a48d5cf7343b08da12e067680b4c6dbfe551be',
            sellAmount: '9939765023954833707731',
            buyAmount: '287859086732337904',
            validTo: 1712259433,
            appData:
              '{"appCode":"shapeshift","metadata":{"orderClass":{"orderClass":"market"},"quote":{"slippageBips":50}},"version":"1.3.0"}',
            appDataHash: '0x41fffc0127f56060cc551652721d84c336f87649a20c51fcff5b8841dfeabe5b',
            feeAmount: '0',
            kind: 'sell',
            partiallyFillable: false,
            sellTokenBalance: 'erc20',
            buyTokenBalance: 'erc20',
            signingScheme: 'eip712',
            quoteId: 474006349,
          },
        },
      })
    })
  })

  describe('rate', () => {
    it('should return a zero network fee and no transaction data', () => {
      const args = {
        ...commonArgs,
        type: 'rate',
        input: {} as GetTradeRateInput,
      } satisfies Extract<GetCowSwapStepDataArgs, { type: 'rate' }>

      const actual = getCowSwapStepData(args).unwrap()

      expect(actual).toEqual({ networkFeeCryptoBaseUnit: '0' })
    })
  })
})
