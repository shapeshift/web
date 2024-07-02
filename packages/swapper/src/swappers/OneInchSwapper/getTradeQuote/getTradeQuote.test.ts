import type { ChainId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import { Ok } from '@sniptt/monads'
import type { AxiosResponse } from 'axios'
import { describe, expect, it, vi } from 'vitest'

import type { SwapperDeps } from '../../../types'
import { SwapperName } from '../../../types'
import { setupQuote } from '../../utils/test-data/setupSwapQuote'
import { oneInchService } from '../utils/oneInchService'
import type { OneInchBaseResponse } from '../utils/types'
import { getTradeQuote } from './getTradeQuote'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('../utils/oneInchService', () => {
  const mockAxios = {
    default: {
      create: vi.fn(() => ({
        get: mocks.get,
        post: mocks.post,
      })),
    },
  }

  return {
    oneInchService: mockAxios.default.create(),
  }
})

const averageGasPrice = '15000000000' // 15 gwei
const mockGetEvmChainAdapter = (_chainId: ChainId) =>
  ({
    getChainId: vi.fn(() => 'eip155:1'),
    getGasFeeData: vi.fn(() => ({
      average: { gasPrice: averageGasPrice },
    })),
  }) as unknown as EvmChainAdapter

describe('getTradeQuote', () => {
  const apiUrl = 'https://api-shapeshift.1inch.io/v5.0'
  const quoteURL = `${apiUrl}/1/quote`
  const approvalURL = `${apiUrl}/1/approve/spender`

  it('returns the correct quote', async () => {
    vi.mocked(oneInchService.get).mockImplementation(async (url: string) => {
      switch (url) {
        case approvalURL:
          return await Promise.resolve(
            Ok({
              data: {
                address: '0x1111111254eeb25477b68fb85ed929f73a960583',
              },
            } as unknown as AxiosResponse<OneInchBaseResponse>),
          )
        case quoteURL:
          return await Promise.resolve(
            Ok({
              data: {
                fromToken: {
                  symbol: 'FOX',
                  name: 'FOX',
                  decimals: 18,
                  address: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
                  logoURI: 'https://tokens.1inch.io/0xc770eefad204b5180df6a14ee197d99d808ee52d.png',
                  tags: ['tokens'],
                },
                toToken: {
                  symbol: 'WETH',
                  name: 'Wrapped Ether',
                  address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                  decimals: 18,
                  logoURI: 'https://tokens.1inch.io/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2.png',
                  wrappedNative: 'true',
                  tags: ['tokens', 'PEG:ETH'],
                },
                toTokenAmount: '16426735042245',
                fromTokenAmount: '1000000000000000000',
                protocols: [
                  [
                    [
                      {
                        name: 'UNISWAP_V2',
                        part: 100,
                        fromTokenAddress: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
                        toTokenAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                      },
                    ],
                  ],
                ],
                estimatedGas: 189386,
              },
            } as unknown as AxiosResponse<OneInchBaseResponse>),
          )
        default:
          console.log({ url })
          return await Promise.resolve(Ok({} as unknown as AxiosResponse<OneInchBaseResponse>))
      }
    })

    const { quoteInput } = setupQuote()
    const maybeQuote = await getTradeQuote(quoteInput, {
      assertGetEvmChainAdapter: mockGetEvmChainAdapter,
      config: {
        REACT_APP_ONE_INCH_API_URL: apiUrl,
      },
    } as unknown as SwapperDeps)
    expect(maybeQuote.isOk()).toBe(true)
    const quote = maybeQuote.unwrap()
    expect(quote.steps[0].rate).toBe('0.000016426735042245')
    expect(quote.steps[0].allowanceContract).toBe('0x1111111254eeb25477b68fb85ed929f73a960583')
    expect(quote.steps[0].source).toEqual(SwapperName.OneInch)
  })
})
