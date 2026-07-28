import { KnownChainIds } from '@shapeshiftoss/types'
import { Ok } from '@sniptt/monads'
import { describe, expect, it, vi } from 'vitest'

import type { GetEvmTradeQuoteInput, SwapperDeps } from '../../../types'
import { ETH, USDC_MAINNET, WETH } from '../../../utils/test-data/assets'
import { ROUTE_QUOTE } from '../test-data/routeQuote'
import { getTradeQuote } from './getTradeQuote'

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

const mockEvmChainAdapter = {
  getGasFeeData: () =>
    Promise.resolve({
      average: {
        gasPrice: '1000000000',
        maxFeePerGas: '2000000000',
        maxPriorityFeePerGas: '1000000000',
      },
    }),
}

describe('getTradeQuote', () => {
  it('should return a trade quote', async () => {
    const deps: SwapperDeps = {
      assetsById: { [ETH.assetId]: ETH },
      assertGetChainAdapter: () => vi.fn() as any,
      assertGetEvmChainAdapter: () => mockEvmChainAdapter as any,
      assertGetUtxoChainAdapter: () => vi.fn() as any,
      assertGetCosmosSdkChainAdapter: () => vi.fn() as any,
      assertGetSolanaChainAdapter: () => vi.fn() as any,
      assertGetTronChainAdapter: () => vi.fn() as any,
      assertGetSuiChainAdapter: () => vi.fn() as any,
      assertGetNearChainAdapter: () => vi.fn() as any,
      assertGetStarknetChainAdapter: () => vi.fn() as any,
      assertGetTonChainAdapter: () => vi.fn() as any,
      config: {
        VITE_BUTTERSWAP_CLIENT_ID: 'test',
      } as any,
      mixPanel: undefined,
      fetchIsSmartContractAddressQuery: vi.fn(),
    }

    const input: GetEvmTradeQuoteInput = {
      sellAmountIncludingProtocolFeesCryptoBaseUnit: '1000000000000000000',
      sellAsset: WETH,
      buyAsset: USDC_MAINNET,
      sendAddress: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
      receiveAddress: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
      accountNumber: 0,
      affiliateBps: '0',
      allowMultiHop: true,
      quoteOrRate: 'quote',
      chainId: KnownChainIds.EthereumMainnet,
      supportsEIP1559: false,
    }

    const result = await getTradeQuote(input, deps)

    expect(result.isOk()).toBe(true)
    const tradeQuote = result.unwrap()

    // The built swap tx is what distinguishes a quote from a rate - see
    // getButterSwapStepData.test.ts for the per-namespace build and fee behaviour
    expect(tradeQuote[0].steps[0].transactionData).toEqual({
      type: 'evm',
      chainId: 1,
      to: '0xContractAddress',
      data: '0xCalldata',
      value: '0',
      gasLimit: '1159118',
    })
    // The route contract, since this is not the tron path that spends via the buildTx target
    expect(tradeQuote[0].steps[0].allowanceContract).toBe(
      '0xEE030ec6F4307411607E55aCD08e628Ae6655B86',
    )
  })
})
