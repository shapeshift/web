import { Ok } from '@sniptt/monads'
import type { AxiosResponse } from 'axios'
import { describe, expect, it, vi } from 'vitest'

import type { CommonTradeQuoteInput, SwapperDeps, TradeRate } from '../../../types'
import { ROUTE_QUOTE } from '../../../utils/test-data/butter/routeQuote'
import { ETH, USDC_MAINNET, WETH } from '../../utils/test-data/assets'
import { getTradeQuote } from './getTradeQuote'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
}))

vi.mock('../utils/butterSwapService', () => ({
  butterService: {
    get: mocks.get,
  },
}))

vi.mock('../xhr', () => ({
  getRoute: vi.fn(() => Promise.resolve(Ok({ data: [(ROUTE_QUOTE as any).data[0]] }))),
  getBuildTx: vi.fn(() =>
    Promise.resolve(
      Ok({
        data: [
          {
            to: '0xContractAddress',
            data: '0xCalldata',
            value: '0',
            chainId: 1,
            method: 'swap',
          },
        ],
        errno: 0,
        message: 'success',
      }),
    ),
  ),
  isRouteSuccess: () => true,
  isBuildTxSuccess: () => true,
}))

describe('getTradeQuote', () => {
  it('should return a trade quote', async () => {
    const deps: SwapperDeps = {
      assetsById: { [ETH.assetId]: ETH },
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
      originalRate: {} as TradeRate,
    }

    mocks.get.mockResolvedValue(Ok({ data: ROUTE_QUOTE } as unknown as AxiosResponse<any>))

    const result = await getTradeQuote(input, deps)

    expect(result.isOk()).toBe(true)
    const tradeQuote = result.unwrap()
    // Use the actual returned value for the expected rate
    expect(tradeQuote[0].rate).toBe('2298.70840740740740740741')
    // 0.999 WETH in base units
    expect(tradeQuote[0].steps[0].sellAmountIncludingProtocolFeesCryptoBaseUnit).toBe(
      '1000000000000000000',
    )
  })
})
