import axios from 'axios'
import { ChainTypes, getMarketData, getPriceHistory, HistoryTimeframe } from '..'

jest.mock('axios')

const mockedAxios = axios as jest.Mocked<typeof axios>

describe('coingecko market service', () => {
  describe('getMarketData', () => {
    const args = {
      chain: ChainTypes.Ethereum,
      tokenId: ''
    }

    it('should return market data for ETH', async () => {
      const result = {
        price: 3611.19,
        marketCap: 424970837706,
        changePercent24Hr: 2.19682,
        volume: 21999495657
      }
      const market_data = {
        current_price: {
          usd: result.price
        },
        market_cap: {
          usd: result.marketCap
        },
        price_change_percentage_24h: result.changePercent24Hr,
        total_volume: {
          usd: result.volume
        }
      }
      mockedAxios.get.mockResolvedValue({ data: { market_data } })
      expect(await getMarketData(args)).toEqual(result)
    })

    it('should return null on network error', async () => {
      mockedAxios.get.mockRejectedValue(Error)
      jest.spyOn(console, 'warn').mockImplementation(() => void 0)
      await expect(getMarketData(args)).resolves.toEqual(null)
    })
  })

  describe('getPriceHistory', () => {
    const args = {
      chain: ChainTypes.Ethereum,
      timeframe: HistoryTimeframe.HOUR
    }

    it('should return market data for ETH', async () => {
      const mockHistoryData = [
        [1631664000000, 47135.43199562694],
        [1631577600000, 45139.83396873267],
        [1631491200000, 46195.21830082935],
        [1631404800000, 45196.488277558245]
      ]

      const expected = [
        { date: new Date('2021-09-15T00:00:00.000Z'), price: 47135.43199562694 },
        { date: new Date('2021-09-14T00:00:00.000Z'), price: 45139.83396873267 },
        { date: new Date('2021-09-13T00:00:00.000Z'), price: 46195.21830082935 },
        { date: new Date('2021-09-12T00:00:00.000Z'), price: 45196.488277558245 }
      ]
      mockedAxios.get.mockResolvedValue({ data: { prices: mockHistoryData } })
      expect(await getPriceHistory(args)).toEqual(expected)
    })

    it('should return null on network error', async () => {
      mockedAxios.get.mockRejectedValue(Error)
      jest.spyOn(console, 'warn').mockImplementation(() => void 0)
      await expect(getPriceHistory(args)).resolves.toEqual(null)
    })
  })
})
