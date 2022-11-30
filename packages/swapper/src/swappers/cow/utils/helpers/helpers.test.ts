import { ethereum } from '@shapeshiftoss/chain-adapters'
import Web3 from 'web3'

import { BTC, ETH, FOX, USDC, WBTC } from '../../../utils/test-data/assets'
import { CowSwapperDeps } from '../../CowSwapper'
import { DEFAULT_ADDRESS, DEFAULT_APP_DATA, ORDER_KIND_BUY } from '../constants'
import { cowService } from '../cowService'
import {
  CowSwapOrder,
  domain,
  getNowPlusThirtyMinutesTimestamp,
  getUsdRate,
  hashOrder,
} from './helpers'

jest.mock('../cowService')

const expectedQuoteInputForUsdRate = {
  receiver: DEFAULT_ADDRESS,
  appData: DEFAULT_APP_DATA,
  partiallyFillable: false,
  from: DEFAULT_ADDRESS,
  kind: ORDER_KIND_BUY,
  buyAmountAfterFee: '1000000000',
}

describe('utils', () => {
  const cowSwapperDeps: CowSwapperDeps = {
    apiUrl: 'https://api.cow.fi/mainnet/api',
    adapter: {} as ethereum.ChainAdapter,
    web3: {} as Web3,
  }

  describe('getUsdRate', () => {
    it('gets the usd rate of FOX', async () => {
      ;(cowService.post as jest.Mock<unknown>).mockReturnValue(
        Promise.resolve({
          data: {
            quote: {
              sellAmount: '7702130994619175777719',
            },
          },
        }),
      )

      const rate = await getUsdRate(cowSwapperDeps, FOX)
      expect(parseFloat(rate)).toBeCloseTo(0.129834198, 9)
      expect(cowService.post).toHaveBeenCalledWith(
        'https://api.cow.fi/mainnet/api/v1/quote/',
        expect.objectContaining({
          ...expectedQuoteInputForUsdRate,
          sellToken: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
          buyToken: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        }),
      )
    })

    it('gets the usd rate of WBTC', async () => {
      ;(cowService.post as jest.Mock<unknown>).mockReturnValue(
        Promise.resolve({
          data: {
            quote: {
              sellAmount: '3334763',
            },
          },
        }),
      )
      const rate = await getUsdRate(cowSwapperDeps, WBTC)
      expect(parseFloat(rate)).toBeCloseTo(29987.13851629, 9)
      expect(cowService.post).toHaveBeenCalledWith(
        'https://api.cow.fi/mainnet/api/v1/quote/',
        expect.objectContaining({
          ...expectedQuoteInputForUsdRate,
          sellToken: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
          buyToken: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        }),
      )
    })

    it('should get the rate of WETH when called with ETH', async () => {
      ;(cowService.post as jest.Mock<unknown>).mockReturnValue(
        Promise.resolve({
          data: {
            quote: {
              sellAmount: '913757780947770826',
            },
          },
        }),
      )

      const rate = await getUsdRate(cowSwapperDeps, ETH)
      expect(parseFloat(rate)).toBeCloseTo(1094.381925769, 9)
      expect(cowService.post).toHaveBeenCalledWith(
        'https://api.cow.fi/mainnet/api/v1/quote/',
        expect.objectContaining({
          ...expectedQuoteInputForUsdRate,
          sellToken: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
          buyToken: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        }),
      )
    })

    it('gets the usd rate of USDC without calling api', async () => {
      const rate = await getUsdRate(cowSwapperDeps, USDC)
      expect(rate).toEqual('1')
      expect(cowService.get).not.toHaveBeenCalled()
    })

    it('should fail when called with non-erc20 asset', async () => {
      await expect(getUsdRate(cowSwapperDeps, BTC)).rejects.toThrow(
        '[getUsdRate] - unsupported asset namespace',
      )
    })

    it('should fail when api is returning 0 as token amount', async () => {
      ;(cowService.post as jest.Mock<unknown>).mockReturnValue(
        Promise.resolve({
          data: {
            quote: {
              sellAmount: '0',
            },
          },
        }),
      )
      await expect(getUsdRate(cowSwapperDeps, FOX)).rejects.toThrow(
        '[getUsdRate] - Failed to get sell token amount',
      )
    })

    it('should fail when axios is throwing an error', async () => {
      ;(cowService.get as jest.Mock<unknown>).mockImplementation(() => {
        throw new Error('unexpected error')
      })
      await expect(getUsdRate(cowSwapperDeps, FOX)).rejects.toThrow('[getUsdRate]')
    })
  })

  describe('getNowPlusThirtyMinutesTimestamp', () => {
    const mockDay = '2020-12-31'
    const mockTime = 'T23:59:59.000Z'
    const mockDate = `${mockDay}${mockTime}`
    beforeEach(() => jest.useFakeTimers().setSystemTime(new Date(mockDate)))
    afterEach(() => {
      jest.restoreAllMocks()
      jest.useRealTimers()
    })

    it('should return the timestamp corresponding to current time + 30 minutes (UTC)', () => {
      const timestamp = getNowPlusThirtyMinutesTimestamp()
      expect(timestamp).toEqual(1609460999)
      expect(new Date(timestamp * 1000).toUTCString()).toEqual('Fri, 01 Jan 2021 00:29:59 GMT')
    })
  })

  describe('hashOrder', () => {
    it('should return the correct order digest', () => {
      const order: CowSwapOrder = {
        sellToken: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        buyToken: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
        sellAmount: '20200000000000000',
        buyAmount: '272522025311597443544',
        validTo: 1656667297,
        appData: DEFAULT_APP_DATA,
        feeAmount: '3514395197690019',
        kind: 'sell',
        partiallyFillable: false,
        receiver: '0xFc81A7B9f715A344A7c4ABFc444A774c3E9BA42D',
        sellTokenBalance: 'erc20',
        buyTokenBalance: 'erc20',
      }

      const orderDigest = hashOrder(domain(1, '0x9008D19f58AAbD9eD0D60971565AA8510560ab41'), order)
      expect(orderDigest).toEqual(
        '0x4a3f1f235892ceb8df4a4ab3f3e22e13364251aeb0d1dde4c2ce66f8c27af757',
      )
    })
  })
})
