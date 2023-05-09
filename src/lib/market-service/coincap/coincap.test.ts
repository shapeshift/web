import { adapters } from '@shapeshiftoss/caip'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import axios from 'axios'

import { CoinCapMarketService } from './coincap'
import type { CoinCapMarketCap } from './coincap-types'

const coinMarketService = new CoinCapMarketService()

jest.mock('axios')

const mockedAxios = axios as jest.Mocked<typeof axios>

describe('coincap market service', () => {
  describe('getMarketCap', () => {
    const btc: CoinCapMarketCap = {
      id: 'bitcoin',
      rank: '1',
      symbol: 'BTC',
      name: 'Bitcoin',
      supply: '18901193.0000000000000000',
      maxSupply: '21000000.0000000000000000',
      marketCapUsd: '908356345541.2269154394485668',
      volumeUsd24Hr: '19001957914.4173604708767279',
      priceUsd: '48058.1487920485715076',
      changePercent24Hr: '2.0370678507913180',
      vwap24Hr: '47473.8260811456834087',
      explorer: 'https://blockchain.info/',
    }

    const eth: CoinCapMarketCap = {
      id: 'ethereum',
      rank: '2',
      symbol: 'ETH',
      name: 'Ethereum',
      supply: '118739782.1240000000000000',
      maxSupply: null,
      marketCapUsd: '461557096820.5397856216327206',
      volumeUsd24Hr: '13216473429.9114945699035335',
      priceUsd: '3887.1310740534754598',
      changePercent24Hr: '1.7301970732523704',
      vwap24Hr: '3796.0013297212388563',
      explorer: 'https://etherscan.io/',
    }

    it('can flatten multiple responses', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({ data: { data: [eth] } })
        .mockResolvedValue({ data: { data: [btc] } })
      const result = await coinMarketService.findAll()
      expect(Object.keys(result).length).toEqual(2)
    })

    it('can sort by market cap', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({ data: { data: [eth] } })
        .mockResolvedValue({ data: { data: [btc] } })
      const result = await coinMarketService.findAll()
      expect(Object.keys(result)[0]).toEqual(adapters.coincapToAssetId(btc.id))
    })

    it('can handle api errors', async () => {
      mockedAxios.get.mockRejectedValue({ error: 'foo' })
      const result = await coinMarketService.findAll()
      expect(Object.keys(result).length).toEqual(0)
    })

    it('can handle rate limiting', async () => {
      mockedAxios.get.mockResolvedValue({ status: 429 })
      const result = await coinMarketService.findAll()
      expect(Object.keys(result).length).toEqual(0)
    })

    it('can return some results if partially rate limited', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({ status: 429 })
        .mockResolvedValue({ data: { data: [eth] } })
      const result = await coinMarketService.findAll()
      expect(Object.keys(result).length).toEqual(1)
    })

    it('can use default args', async () => {
      mockedAxios.get.mockResolvedValue({ data: { data: [btc] } })
      await coinMarketService.findAll()
      expect(mockedAxios.get).toHaveBeenCalledTimes(10)
    })

    it('can use override args', async () => {
      mockedAxios.get.mockResolvedValue({ data: [btc] })
      await coinMarketService.findAll({ count: 10 })
      expect(mockedAxios.get).toHaveBeenCalledTimes(1)
      const url = 'https://api.coincap.io/v2/assets?limit=10&offset=1'
      expect(mockedAxios.get).toBeCalledWith(url)
    })

    it('can map coincap to AssetIds', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({ data: { data: [eth] } })
        .mockResolvedValue({ data: { data: [btc] } })
      const result = await coinMarketService.findAll()
      const btcAssetIds = adapters.coincapToAssetId('bitcoin')
      const ethAssetIds = adapters.coincapToAssetId('ethereum')
      const [btcKey, ethKey] = Object.keys(result)
      expect(btcKey).toEqual(btcAssetIds)
      expect(ethKey).toEqual(ethAssetIds)
    })
  })

  describe('findByAssetId', () => {
    const args1 = {
      assetId: 'eip155:1/slip44:60',
    }
    const args2 = {
      assetId: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
    }

    const btc: CoinCapMarketCap = {
      id: 'bitcoin',
      rank: '1',
      symbol: 'BTC',
      name: 'Bitcoin',
      supply: '18901193.0000000000000000',
      maxSupply: '21000000.0000000000000000',
      marketCapUsd: '908356345541.2269154394485668',
      volumeUsd24Hr: '19001957914.4173604708767279',
      priceUsd: '48058.1487920485715076',
      changePercent24Hr: '2.0370678507913180',
      vwap24Hr: '47473.8260811456834087',
      explorer: 'https://blockchain.info/',
    }

    const eth: CoinCapMarketCap = {
      id: 'ethereum',
      rank: '2',
      symbol: 'ETH',
      name: 'Ethereum',
      supply: '118739782.1240000000000000',
      maxSupply: null,
      marketCapUsd: '461557096820.5397856216327206',
      volumeUsd24Hr: '13216473429.9114945699035335',
      priceUsd: '3887.1310740534754598',
      changePercent24Hr: '1.7301970732523704',
      vwap24Hr: '3796.0013297212388563',
      explorer: 'https://etherscan.io/',
    }

    it('should return market data for ETH', async () => {
      const result = {
        changePercent24Hr: 1.7301970732523704,
        marketCap: '461557096820.5397856216327206',
        price: '3887.1310740534754598',
        volume: '13216473429.9114945699035335',
        supply: '118739782.1240000000000000',
      }
      mockedAxios.get.mockResolvedValue({ data: { data: eth } })
      expect(await coinMarketService.findByAssetId(args1)).toEqual(result)
    })

    it('should return market data for BTC', async () => {
      const result = {
        changePercent24Hr: 2.037067850791318,
        marketCap: '908356345541.2269154394485668',
        price: '48058.1487920485715076',
        volume: '19001957914.4173604708767279',
        supply: '18901193.0000000000000000',
        maxSupply: '21000000.0000000000000000',
      }
      mockedAxios.get.mockResolvedValue({ data: { data: btc } })
      expect(await coinMarketService.findByAssetId(args2)).toEqual(result)
    })

    it('should return null on network error', async () => {
      mockedAxios.get.mockRejectedValue(Error)
      await expect(coinMarketService.findByAssetId(args1)).rejects.toThrow()
    })
  })

  describe('findPriceHistoryByAssetId', () => {
    const args = {
      assetId: 'eip155:1/slip44:60',
      timeframe: HistoryTimeframe.HOUR,
    }

    it('should return market data for ETH', async () => {
      const mockHistoryData = [
        { time: 1631664000000, priceUsd: '47135.43199562694' },
        { time: 1631577600000, priceUsd: '45139.83396873267' },
        { time: 1631491200000, priceUsd: '46195.21830082935' },
        { time: 1631404800000, priceUsd: '45196.488277558245' },
      ]

      const expected = [
        { date: new Date('2021-09-15T00:00:00.000Z').valueOf(), price: 47135.43199562694 },
        { date: new Date('2021-09-14T00:00:00.000Z').valueOf(), price: 45139.83396873267 },
        { date: new Date('2021-09-13T00:00:00.000Z').valueOf(), price: 46195.21830082935 },
        { date: new Date('2021-09-12T00:00:00.000Z').valueOf(), price: 45196.488277558245 },
      ]
      mockedAxios.get.mockResolvedValue({ data: { data: mockHistoryData } })
      expect(await coinMarketService.findPriceHistoryByAssetId(args)).toEqual(expected)
    })

    it('should return null on network error', async () => {
      mockedAxios.get.mockRejectedValue(Error)
      await expect(coinMarketService.findPriceHistoryByAssetId(args)).rejects.toEqual(
        new Error('MarketService(findPriceHistoryByAssetId): error fetching price history'),
      )
    })
  })
})
