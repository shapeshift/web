import { adapters } from '@shapeshiftoss/caip'
import { ChainTypes, CoinGeckoMarketCap, HistoryTimeframe } from '@shapeshiftoss/types'
import axios from 'axios'

import { getByMarketCap, getMarketData, getPriceHistory } from '..'

jest.mock('axios')

const mockedAxios = axios as jest.Mocked<typeof axios>

describe('coingecko market service', () => {
  describe('getMarketCap', () => {
    const btc: CoinGeckoMarketCap = {
      id: 'bitcoin',
      symbol: 'btc',
      name: 'Bitcoin',
      image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png?1547033579',
      current_price: 54810,
      market_cap: 1032270421549,
      market_cap_rank: 1,
      fully_diluted_valuation: 1150605422455,
      total_volume: 38267223547,
      high_24h: 56716,
      low_24h: 54302,
      price_change_24h: -183.589684444189,
      price_change_percentage_24h: -0.33384,
      market_cap_change_24h: -2846224478.5008545,
      market_cap_change_percentage_24h: -0.27497,
      circulating_supply: 18840237,
      total_supply: 21000000,
      max_supply: 21000000,
      ath: 64805,
      ath_change_percentage: -15.20896,
      ath_date: '2021-04-14T11:54:46.763Z',
      atl: 67.81,
      atl_change_percentage: 80934.36893,
      atl_date: '2013-07-06T00:00:00.000Z',
      roi: null,
      last_updated: '2021-10-10T22:16:39.866Z'
    }

    const eth: CoinGeckoMarketCap = {
      id: 'ethereum',
      symbol: 'eth',
      name: 'Ethereum',
      image: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png?1595348880',
      current_price: 3459.72,
      market_cap: 407989270877,
      market_cap_rank: 2,
      fully_diluted_valuation: null,
      total_volume: 17486135198,
      high_24h: 3605.6,
      low_24h: 3459.1,
      price_change_24h: -134.750135067397,
      price_change_percentage_24h: -3.74881,
      market_cap_change_24h: -15764031085.668518,
      market_cap_change_percentage_24h: -3.7201,
      circulating_supply: 117874980.3115,
      total_supply: null,
      max_supply: null,
      ath: 4356.99,
      ath_change_percentage: -20.19316,
      ath_date: '2021-05-12T14:41:48.623Z',
      atl: 0.432979,
      atl_change_percentage: 802982.25606,
      atl_date: '2015-10-20T00:00:00.000Z',
      roi: {
        times: 83.32608527170541,
        currency: 'btc',
        percentage: 8332.60852717054
      },
      last_updated: '2021-10-10T22:16:22.950Z'
    }

    it('can flatten multiple responses', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: [eth] }).mockResolvedValue({ data: [btc] })
      const result = await getByMarketCap()
      expect(Object.keys(result).length).toEqual(2)
    })

    it('can sort by market cap', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: [btc] }).mockResolvedValue({ data: [eth] })
      const result = await getByMarketCap()
      expect(Object.keys(result)[0]).toEqual(adapters.coingeckoToCAIP19(btc.id))
    })

    it('can handle api errors', async () => {
      mockedAxios.get.mockRejectedValue({ error: 'foo' })
      const result = await getByMarketCap()
      expect(Object.keys(result).length).toEqual(0)
    })

    it('can handle rate limiting', async () => {
      mockedAxios.get.mockResolvedValue({ status: 429 })
      const result = await getByMarketCap()
      expect(Object.keys(result).length).toEqual(0)
    })

    it('can return some results if partially rate limited', async () => {
      mockedAxios.get.mockResolvedValueOnce({ status: 429 }).mockResolvedValue({ data: [eth] })
      const result = await getByMarketCap()
      expect(Object.keys(result).length).toEqual(1)
    })

    it('can use default args', async () => {
      mockedAxios.get.mockResolvedValue({ data: [btc] })
      await getByMarketCap()
      expect(mockedAxios.get).toHaveBeenCalledTimes(10)
    })

    it('can use override args', async () => {
      mockedAxios.get.mockResolvedValue({ data: [btc] })
      const pages = 1
      const perPage = 10
      await getByMarketCap({ pages, perPage })
      expect(mockedAxios.get).toHaveBeenCalledTimes(1)
      const url =
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false'
      expect(mockedAxios.get).toBeCalledWith(url)
    })

    it('can map coingecko to caip ids', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: [btc] }).mockResolvedValue({ data: [eth] })
      const result = await getByMarketCap()
      const btcCaip19 = adapters.coingeckoToCAIP19('bitcoin')
      const ethCaip19 = adapters.coingeckoToCAIP19('ethereum')
      const [btcKey, ethKey] = Object.keys(result)
      expect(btcKey).toEqual(btcCaip19)
      expect(ethKey).toEqual(ethCaip19)
    })
  })

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
      await expect(getMarketData(args)).rejects.toEqual(
        new Error('MarketService(getMarketData): error fetching market data')
      )
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
      await expect(getPriceHistory(args)).rejects.toEqual(
        new Error('MarketService(getPriceHistory): error fetching price history')
      )
    })
  })
})
