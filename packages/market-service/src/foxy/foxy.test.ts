import { HistoryTimeframe } from '@shapeshiftoss/types'
import axios from 'axios'

import { FOXY_ASSET_ID, FoxyMarketService } from './foxy'
import { fox, mockFoxyMarketData } from './foxyMockData'

const foxyMarketService = new FoxyMarketService()

jest.mock('axios')

const mockedAxios = axios as jest.Mocked<typeof axios>

describe('foxy market service', () => {
  describe('getMarketCap', () => {
    it('can return fox market data', async () => {
      mockedAxios.get.mockResolvedValue({ data: { data: [fox] } })
      const result = await foxyMarketService.findAll()
      expect(Object.keys(result).length).toEqual(1)
    })

    it('can handle api errors', async () => {
      mockedAxios.get.mockRejectedValue({ error: 'foo' })
      const result = await foxyMarketService.findAll()
      expect(Object.keys(result).length).toEqual(0)
    })

    it('can handle rate limiting', async () => {
      mockedAxios.get.mockResolvedValue({ status: 429 })
      const result = await foxyMarketService.findAll()
      expect(Object.keys(result).length).toEqual(0)
    })
  })

  describe('findByAssetId', () => {
    const args = {
      assetId: FOXY_ASSET_ID
    }

    it('should return market data for FOXy', async () => {
      mockedAxios.get.mockResolvedValue({ data: { data: fox } })
      expect(await foxyMarketService.findByAssetId(args)).toEqual(mockFoxyMarketData)
    })

    it('should return null on network error', async () => {
      mockedAxios.get.mockRejectedValue(Error)
      jest.spyOn(console, 'warn').mockImplementation(() => void 0)
      await expect(foxyMarketService.findByAssetId(args)).rejects.toEqual(
        new Error('FoxyMarketService(findByAssetId): error fetching market data')
      )
    })
  })

  describe('findPriceHistoryByAssetId', () => {
    const args = {
      assetId: FOXY_ASSET_ID,
      timeframe: HistoryTimeframe.HOUR
    }

    it('should return market data for FOXy', async () => {
      const mockHistoryData = [
        { time: 1631664000000, priceUsd: '0.480621954029937' },
        { time: 1631577600000, priceUsd: '0.48541321175453755' },
        { time: 1631491200000, priceUsd: '0.4860349080635926' },
        { time: 1631404800000, priceUsd: '0.46897407484696146' }
      ]

      const expected = [
        { date: new Date('2021-09-15T00:00:00.000Z').valueOf(), price: 0.480621954029937 },
        { date: new Date('2021-09-14T00:00:00.000Z').valueOf(), price: 0.48541321175453755 },
        { date: new Date('2021-09-13T00:00:00.000Z').valueOf(), price: 0.4860349080635926 },
        { date: new Date('2021-09-12T00:00:00.000Z').valueOf(), price: 0.46897407484696146 }
      ]
      mockedAxios.get.mockResolvedValue({ data: { data: mockHistoryData } })
      expect(await foxyMarketService.findPriceHistoryByAssetId(args)).toEqual(expected)
    })

    it('should return null on network error', async () => {
      mockedAxios.get.mockRejectedValue(Error)
      jest.spyOn(console, 'warn').mockImplementation(() => void 0)
      await expect(foxyMarketService.findPriceHistoryByAssetId(args)).rejects.toEqual(
        new Error('FoxyMarketService(findPriceHistoryByAssetId): error fetching price history')
      )
    })
  })
})
