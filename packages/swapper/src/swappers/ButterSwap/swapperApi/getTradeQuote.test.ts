import { Ok } from '@sniptt/monads'
import type { AxiosResponse } from 'axios'
import { describe, expect, it, vi } from 'vitest'

import type { CommonTradeQuoteInput, SwapperDeps } from '../../../types'
import { ROUTE_QUOTE } from '../../../utils/test-data/butter/routeQuote'
import { USDC_MAINNET, WETH } from '../../utils/test-data/assets'
import { getTradeQuote } from './getTradeQuote'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
}))

vi.mock('../utils/butterSwapService', () => ({
  butterService: {
    get: mocks.get,
  },
}))

describe('getTradeQuote', () => {
  it('should return a trade quote', async () => {
    const deps: SwapperDeps = {
      assetsById: {},
      assertGetChainAdapter: () => vi.fn() as any,
      assertGetEvmChainAdapter: () => vi.fn() as any,
      assertGetUtxoChainAdapter: () => vi.fn() as any,
      assertGetCosmosSdkChainAdapter: () => vi.fn() as any,
      assertGetSolanaChainAdapter: () => vi.fn() as any,
      config: {
        VITE_BUTTERSWAP_CLIENT_ID: 'test',
      } as any,
      mixPanel: undefined,
      fetchIsSmartContractAddressQuery: vi.fn(),
    }

    const input: CommonTradeQuoteInput = {
      sellAmountIncludingProtocolFeesCryptoBaseUnit: '1000000000000000000',
      sellAsset: WETH,
      buyAsset: USDC_MAINNET,
      sendAddress: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
      receiveAddress: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
      accountNumber: 0,
      affiliateBps: '0',
      allowMultiHop: true,
      quoteOrRate: 'quote',
      originalRate: {} as any, // TODO(gomes): provide a realistic rate here
    }

    mocks.get.mockResolvedValue(Ok({ data: ROUTE_QUOTE } as unknown as AxiosResponse<any>))

    const result = await getTradeQuote(input, deps)

    expect(result.isOk()).toBe(true)
    const tradeQuote = result.unwrap()
    expect(tradeQuote[0].rate).toBe('385.349221488530478387')
    expect(tradeQuote[0].steps[0].sellAmountIncludingProtocolFeesCryptoBaseUnit).toBe(
      '1000000000000000000',
    )
  })
})
