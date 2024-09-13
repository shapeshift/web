import { adapters } from '@shapeshiftoss/caip'
import type { MarketData } from '@shapeshiftoss/types'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import type { AxiosInstance } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CoinGeckoMarketService } from './coingecko'
import type { CoinGeckoMarketCap } from './coingecko-types'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('axios', () => {
  const mockAxios = {
    default: {
      create: vi.fn(() => ({
        get: mocks.get,
        post: mocks.post,
      })),
    },
  }

  return {
    default: {
      ...mockAxios.default.create(),
      create: mockAxios.default.create,
    },
  }
})

vi.mock('axios-cache-interceptor', () => ({
  setupCache: vi.fn().mockImplementation((axiosInstance: AxiosInstance) => axiosInstance),
}))

const coinGeckoMarketService = new CoinGeckoMarketService()

describe('CoinGecko market service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('findAll', () => {
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
      last_updated: '2021-10-10T22:16:39.866Z',
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
        percentage: 8332.60852717054,
      },
      last_updated: '2021-10-10T22:16:22.950Z',
    }

    const fox: CoinGeckoMarketCap = {
      id: 'shapeshift-fox-token',
      symbol: 'fox',
      name: 'ShapeShift FOX Token',
      image: 'https://assets.coingecko.com/coins/images/9988/large/FOX.png?1574330622',
      current_price: 0.162007,
      market_cap: 59502764,
      market_cap_rank: 387,
      fully_diluted_valuation: null,
      total_volume: 450668,
      high_24h: 0.170539,
      low_24h: 0.15958,
      price_change_24h: 0.150135067397,
      price_change_percentage_24h: 3.74881,
      market_cap_change_24h: -3193491.5176411,
      market_cap_change_percentage_24h: -5.09359,
      circulating_supply: 368461498.77715254,
      total_supply: 1000001337.0,
      max_supply: null,
      ath: 1.65,
      ath_change_percentage: -20.19316,
      ath_date: '2021-05-12T14:41:48.623Z',
      atl: 0.432979,
      atl_change_percentage: 802982.25606,
      atl_date: '2015-10-20T00:00:00.000Z',
      roi: {
        times: 83.32608527170541,
        currency: 'btc',
        percentage: 8332.60852717054,
      },
      last_updated: '2021-10-10T22:16:22.950Z',
    }

    const usdc: CoinGeckoMarketCap = {
      ath: 1.17,
      ath_change_percentage: -14.79969,
      ath_date: '2019-05-08T00:40:28.300Z',
      atl: 0.891848,
      atl_change_percentage: 12.03135,
      atl_date: '2021-05-19T13:14:05.611Z',
      circulating_supply: 54492069074.1417,
      current_price: 1,
      fully_diluted_valuation: null,
      high_24h: 1.015,
      id: 'usd-coin',
      image: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png?1547042389',
      last_updated: '2022-08-01T05:50:36.806Z',
      low_24h: 0.99002,
      market_cap: 54500234986,
      market_cap_change_24h: 33737555,
      market_cap_change_percentage_24h: 0.06194,
      market_cap_rank: 4,
      max_supply: null,
      name: 'USD Coin',
      price_change_24h: -0.000088001691941342,
      price_change_percentage_24h: -0.0088,
      roi: null,
      symbol: 'usdc',
      total_supply: 54494627696.0103,
      total_volume: 5745233196,
    }

    it('can flatten multiple responses', async () => {
      mocks.get.mockResolvedValueOnce({ data: [eth] }).mockResolvedValue({ data: [btc] })
      const result = await coinGeckoMarketService.findAll()
      expect(Object.keys(result).length).toEqual(6)
    })

    it('can sort by market cap', async () => {
      mocks.get.mockResolvedValueOnce({ data: [btc] }).mockResolvedValue({ data: [eth] })
      const result = await coinGeckoMarketService.findAll()
      expect(adapters.coingeckoToAssetIds(btc.id)).toEqual([Object.keys(result)[0]])
    })

    it('can handle api errors', async () => {
      mocks.get.mockRejectedValue({ error: 'foo' })
      const result = await coinGeckoMarketService.findAll()
      expect(Object.keys(result).length).toEqual(0)
    })

    it('can handle rate limiting', async () => {
      mocks.get.mockResolvedValue({ status: 429 })
      const result = await coinGeckoMarketService.findAll()
      expect(Object.keys(result).length).toEqual(0)
    })

    it('can return some results if partially rate limited', async () => {
      mocks.get.mockResolvedValueOnce({ status: 429 }).mockResolvedValue({ data: [eth] })
      const result = await coinGeckoMarketService.findAll()
      expect(Object.keys(result).length).toEqual(5)
    })

    it('can use default args', async () => {
      const spy = mocks.get.mockResolvedValue({ data: [btc] })
      await coinGeckoMarketService.findAll()
      expect(spy).toHaveBeenCalledTimes(10)
    })

    it('can use override args', async () => {
      const spy = mocks.get.mockResolvedValue({ data: [btc] })
      await coinGeckoMarketService.findAll({ count: 10 })
      expect(spy).toHaveBeenCalledTimes(1)
      const url = `${adapters.coingeckoBaseUrl}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false`
      expect(spy).toBeCalledWith(url)
    })

    it('makes multiple calls for a large count', async () => {
      const spy = mocks.get.mockResolvedValue({ data: [btc] })
      await coinGeckoMarketService.findAll({ count: 300 })
      expect(spy).toHaveBeenCalledTimes(2)
    })

    it('can map CoinGecko id to assetIds', async () => {
      mocks.get.mockResolvedValueOnce({ data: [btc] }).mockResolvedValue({ data: [eth] })
      const result = await coinGeckoMarketService.findAll()
      const btcAssetId = adapters.coingeckoToAssetIds('bitcoin')
      const ethAssetId = adapters.coingeckoToAssetIds('ethereum')
      const [btcKey, ethKey, ethOptimismKey, ethOnArbitrumKey, ethOnArbitrumNovaKey, ethOnBaseKey] =
        Object.keys(result)
      expect(btcAssetId).toEqual([btcKey])
      expect(ethAssetId).toEqual([
        ethKey,
        ethOptimismKey,
        ethOnArbitrumKey,
        ethOnArbitrumNovaKey,
        ethOnBaseKey,
      ])
    })

    it('can map CoinGecko id to multiple assetIds', async () => {
      mocks.get.mockResolvedValue({ data: [usdc] })
      const result = await coinGeckoMarketService.findAll()
      const usdcAssetIds = adapters.coingeckoToAssetIds('usd-coin')
      expect(usdcAssetIds).toEqual(Object.keys(result))
    })

    it('extract correct values for each asset', async () => {
      const btcResult = {
        price: '54810',
        marketCap: '1032270421549',
        changePercent24Hr: -0.33384,
        volume: '38267223547',
        supply: '18840237',
        maxSupply: '21000000',
      }

      const ethResult = {
        price: '3459.72',
        marketCap: '407989270877',
        changePercent24Hr: -3.74881,
        volume: '17486135198',
        supply: '117874980.3115',
      }

      mocks.get.mockResolvedValueOnce({ data: [btc] }).mockResolvedValue({ data: [eth] })
      const result = await coinGeckoMarketService.findAll()
      const btcAssetId = adapters.coingeckoToAssetIds('bitcoin')[0]
      const ethAssetId = adapters.coingeckoToAssetIds('ethereum')[0]
      expect(result[btcAssetId!]).toEqual(btcResult)
      expect(result[ethAssetId!]).toEqual(ethResult)
    })

    it('extract correct values for fox', async () => {
      const foxResult = {
        price: '0.162007',
        marketCap: '59502764',
        changePercent24Hr: 3.74881,
        volume: '450668',
        supply: '368461498.77715254',
        maxSupply: '1000001337',
      }

      mocks.get.mockResolvedValue({ data: [fox] })
      const result = await coinGeckoMarketService.findAll()
      const foxAssetId = adapters.coingeckoToAssetIds('shapeshift-fox-token')[0]
      expect(result[foxAssetId!]).toEqual(foxResult)
    })
  })

  describe('findByAssetId', () => {
    const args = {
      assetId: 'eip155:1/slip44:60',
    }

    it('should return market data for ETH', async () => {
      const result: MarketData = {
        price: '3611.19',
        marketCap: '424970837706',
        changePercent24Hr: 2.19682,
        volume: '21999495657',
        supply: '120839129.44',
      }
      const market_data = {
        current_price: {
          usd: Number(result.price),
        },
        market_cap: {
          usd: Number(result.marketCap),
        },
        price_change_percentage_24h: result.changePercent24Hr,
        total_volume: {
          usd: Number(result.volume),
        },
        circulating_supply: Number(result.supply),
        max_supply: null,
        total_supply: null,
      }
      mocks.get.mockResolvedValue({ data: { market_data } })
      expect(await coinGeckoMarketService.findByAssetId(args)).toEqual(result)
    })

    it('should return market data for BTC', async () => {
      const result: MarketData = {
        price: '54810',
        marketCap: '1032270421549',
        changePercent24Hr: -0.33384,
        volume: '38267223547',
        supply: '18840237',
        maxSupply: '21000000',
      }
      const market_data = {
        current_price: {
          usd: Number(result.price),
        },
        market_cap: {
          usd: Number(result.marketCap),
        },
        price_change_percentage_24h: result.changePercent24Hr,
        total_volume: {
          usd: Number(result.volume),
        },
        circulating_supply: Number(result.supply),
        max_supply: Number(result.maxSupply),
        total_supply: Number(result.maxSupply),
      }
      mocks.get.mockResolvedValue({ data: { market_data } })
      expect(await coinGeckoMarketService.findByAssetId(args)).toEqual(result)
    })

    it('should return market data for FOX', async () => {
      const result: MarketData = {
        price: '0.25007',
        marketCap: '59502764',
        changePercent24Hr: 5.45678,
        volume: '1571401',
        supply: '368444695.88',
        maxSupply: '1000001337',
      }
      const market_data = {
        current_price: {
          usd: Number(result.price),
        },
        market_cap: {
          usd: Number(result.marketCap),
        },
        price_change_percentage_24h: result.changePercent24Hr,
        total_volume: {
          usd: Number(result.volume),
        },
        circulating_supply: Number(result.supply),
        max_supply: null,
        total_supply: Number(result.maxSupply),
      }
      mocks.get.mockResolvedValue({ data: { market_data } })
      expect(await coinGeckoMarketService.findByAssetId(args)).toEqual(result)
    })

    it('should return null on network error', async () => {
      mocks.get.mockRejectedValue(Error)
      await expect(coinGeckoMarketService.findByAssetId(args)).rejects.toEqual(
        new Error('CoinGeckoMarketService(findByAssetId): error fetching market data'),
      )
    })
  })

  describe('findPriceHistoryByAssetId', () => {
    const args = {
      assetId: 'eip155:1/slip44:60',
      timeframe: HistoryTimeframe.HOUR,
    }

    it('should return market data for ETH', async () => {
      const mockHistoryData = [
        [1631664000000, 47135.43199562694],
        [1631577600000, 45139.83396873267],
        [1631491200000, 46195.21830082935],
        [1631404800000, 45196.488277558245],
      ]

      const expected = [
        { date: new Date('2021-09-15T00:00:00.000Z').valueOf(), price: 47135.43199562694 },
        { date: new Date('2021-09-14T00:00:00.000Z').valueOf(), price: 45139.83396873267 },
        { date: new Date('2021-09-13T00:00:00.000Z').valueOf(), price: 46195.21830082935 },
        { date: new Date('2021-09-12T00:00:00.000Z').valueOf(), price: 45196.488277558245 },
      ]
      mocks.get.mockResolvedValue({ data: { prices: mockHistoryData } })
      expect(await coinGeckoMarketService.findPriceHistoryByAssetId(args)).toEqual(expected)
    })

    it('should return null on network error', async () => {
      mocks.get.mockRejectedValue(Error)
      await expect(coinGeckoMarketService.findPriceHistoryByAssetId(args)).rejects.toEqual(
        new Error(
          'CoinGeckoMarketService(findPriceHistoryByAssetId): error fetching price history',
        ),
      )
    })
  })
})
