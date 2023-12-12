import { SwapperName } from '@shapeshiftoss/swapper'
import { Ok } from '@sniptt/monads'
import type { AxiosStatic } from 'axios'

import { setupQuote } from '../../utils/test-data/setupSwapQuote'
import { oneInchService } from '../utils/oneInchService'
import { getTradeQuote } from './getTradeQuote'

jest.mock('../utils/oneInchService', () => {
  const axios: AxiosStatic = jest.createMockFromModule('axios')
  axios.create = jest.fn(() => axios)

  return {
    oneInchService: axios.create(),
  }
})

const averageGasPrice = '15000000000' // 15 gwei
jest.mock('context/PluginProvider/chainAdapterSingleton', () => ({
  getChainAdapterManager: () => {
    return {
      get: () => ({
        getChainId: () => 'eip155:1',
        getGasFeeData: () => ({
          average: { gasPrice: averageGasPrice },
        }),
      }),
    }
  },
}))

describe('getTradeQuote', () => {
  const apiUrl = 'https://api-shapeshift.1inch.io/v5.0'
  const quoteURL = `${apiUrl}/1/quote`
  const approvalURL = `${apiUrl}/1/approve/spender`

  it('returns the correct quote', async () => {
    ;(oneInchService.get as jest.Mock<unknown>).mockImplementation(async url => {
      switch (url) {
        case approvalURL:
          return await Promise.resolve(
            Ok({
              data: { address: '0x1111111254eeb25477b68fb85ed929f73a960583' },
            }),
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
            }),
          )
        default:
          return await Promise.resolve(Ok({}))
      }
    })

    const { quoteInput } = setupQuote()
    const maybeQuote = await getTradeQuote(quoteInput)
    expect(maybeQuote.isOk()).toBe(true)
    const quote = maybeQuote.unwrap()
    expect(quote.steps[0].rate).toBe('0.000016426735042245')
    expect(quote.steps[0].allowanceContract).toBe('0x1111111254eeb25477b68fb85ed929f73a960583')
    expect(quote.steps[0].source).toEqual(SwapperName.OneInch)
  })
})
