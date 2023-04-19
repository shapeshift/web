import axios from 'axios'

import { FOX, WETH } from '../../../../../packages/swapper/src/swappers/utils/test-data/assets'
import type { OneInchSwapperDeps } from '../utils/types'
import { getMinMax, getUsdRate } from './helpers'

jest.mock('axios')
const mockAxios = axios as jest.Mocked<typeof axios>

describe('getUsdRate', () => {
  const deps: OneInchSwapperDeps = {
    apiUrl: 'https://api.1inch.io/v5.0',
  }
  const quoteURL = `${deps.apiUrl}/1/quote`

  it('returns the correct rate', async () => {
    mockAxios.get.mockImplementation(() => {
      return {
        data: {
          fromToken: {
            symbol: 'USDC',
            name: 'USD Coin',
            address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            decimals: 6,
            logoURI: 'https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
            eip2612: true,
            domainVersion: '2',
            tags: ['tokens', 'PEG:USD'],
          },
          toToken: {
            symbol: 'FOX',
            name: 'FOX',
            decimals: 18,
            address: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
            logoURI: 'https://tokens.1inch.io/0xc770eefad204b5180df6a14ee197d99d808ee52d.png',
            tags: ['tokens'],
          },
          toTokenAmount: '304775163721065276710',
          fromTokenAmount: '10000000',
          protocols: [[[Array], [Array]]],
          estimatedGas: 306779,
        },
      }
    })

    const sellAsset = { ...FOX }
    const usdRate = await getUsdRate(deps, sellAsset)
    expect(usdRate).toEqual('0.03281107252279961839')
  })
})

describe('getMinMax', () => {
  const deps: OneInchSwapperDeps = {
    apiUrl: 'https://api.1inch.io/v5.0',
  }
  const quoteURL = `${deps.apiUrl}/1/quote`

  it('returns min and max expected values for FOX', async () => {
    // NOTE: we are mocking the values for getUSDRate here.
    mockAxios.get.mockImplementation(() => {
      return {
        data: {
          fromToken: {
            symbol: 'USDC',
            name: 'USD Coin',
            address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            decimals: 6,
            logoURI: 'https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
            eip2612: true,
            domainVersion: '2',
            tags: ['tokens', 'PEG:USD'],
          },
          toToken: {
            symbol: 'FOX',
            name: 'FOX',
            decimals: 18,
            address: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
            logoURI: 'https://tokens.1inch.io/0xc770eefad204b5180df6a14ee197d99d808ee52d.png',
            tags: ['tokens'],
          },
          toTokenAmount: '304775163721065276710',
          fromTokenAmount: '10000000',
          estimatedGas: 306779,
        },
      }
    })

    const sellAsset = { ...FOX }
    const buyAsset = { ...WETH }
    const minMax = await getMinMax(deps, sellAsset, buyAsset)
    expect(minMax).toEqual({
      maximumAmountCryptoHuman: '100000000000000000000000000',
      minimumAmountCryptoHuman: '30.47751637210652767419',
    })
  })
})
