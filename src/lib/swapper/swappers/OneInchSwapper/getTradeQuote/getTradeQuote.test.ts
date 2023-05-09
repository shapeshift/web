import { Ok } from '@sniptt/monads'
import type { AxiosStatic } from 'axios'

import { setupQuote } from '../../utils/test-data/setupSwapQuote'
import { DEFAULT_SOURCE, MAX_ONEINCH_TRADE } from '../utils/constants'
import { oneInchService } from '../utils/oneInchService'
import type { OneInchSwapperDeps } from '../utils/types'
import { getTradeQuote } from './getTradeQuote'

jest.mock('../utils/oneInchService', () => {
  const axios: AxiosStatic = jest.createMockFromModule('axios')
  axios.create = jest.fn(() => axios)

  return {
    oneInchService: axios.create(),
  }
})

jest.mock('state/zustand/swapperStore/selectors', () => ({
  ...jest.requireActual('state/zustand/swapperStore/selectors'),
  selectSellAssetFiatRate: jest.fn(() => '0.02000'),
}))

const fastGasPrice = '15000000000' // 15 gwei
jest.mock('context/PluginProvider/chainAdapterSingleton', () => ({
  getChainAdapterManager: () => {
    return {
      get: () => ({
        getGasFeeData: () => ({
          fast: { gasPrice: fastGasPrice },
        }),
      }),
    }
  },
}))

describe('getTradeQuote', () => {
  const deps: OneInchSwapperDeps = {
    apiUrl: 'https://api.1inch.io/v5.0',
  }
  const quoteURL = `${deps.apiUrl}/1/quote`
  const approvalURL = `${deps.apiUrl}/1/approve/spender`

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
    const maybeQuote = await getTradeQuote(deps, quoteInput)
    expect(maybeQuote.isOk()).toBe(true)
    const quote = maybeQuote.unwrap()
    expect(quote.rate).toBe('0.000016426735042245')
    expect(quote.allowanceContract).toBe('0x1111111254eeb25477b68fb85ed929f73a960583')
    expect(quote.maximumCryptoHuman).toBe(MAX_ONEINCH_TRADE)
    expect(quote.minimumCryptoHuman).toBe('50')
    expect(quote.sources).toEqual(DEFAULT_SOURCE)
    expect(quote.feeData.chainSpecific.gasPriceCryptoBaseUnit).toBe(fastGasPrice)
  })
})
