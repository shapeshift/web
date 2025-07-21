import { Ok } from '@sniptt/monads'
import { describe, expect, it, vi } from 'vitest'

import type { CommonTradeQuoteInput, SwapperDeps } from '../../../types'
import { ETH, USDC_MAINNET, WETH } from '../../utils/test-data/assets'
import { ROUTE_QUOTE } from '../test-data/routeQuote'
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
  getButterRoute: vi.fn(() => Promise.resolve(Ok(ROUTE_QUOTE))),
  fetchTxData: vi.fn(() =>
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
  it('should not return a trade quote for same-chain swaps', async () => {
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
    }

    const result = await getTradeQuote(input, deps)

    expect(result.isOk()).toBe(false)
    expect(result.isErr()).toBe(true)

    const error = result.unwrapErr()
    expect(error.message).toContain('Same-chain swaps are not supported by ButterSwap')
  })
})
