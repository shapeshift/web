import { adapters } from '@shapeshiftoss/caip'
import { HistoryTimeframe, MarketData } from '@shapeshiftoss/types'
import axios from 'axios'

import { OsmosisMarketService } from './osmosis'
import {
  ion,
  mockHourlyHistoryData,
  mockOsmosisYearlyHistoryData,
  osmo,
  secretNetwork
} from './osmosisMockData'

jest.mock('axios')

const mockedAxios = axios as jest.Mocked<typeof axios>
const osmosisMarketService = new OsmosisMarketService()

describe('osmosis market service', () => {
  describe('findAll', () => {
    it('should sort by market cap', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: [secretNetwork, ion, osmo] })
      const result = await osmosisMarketService.findAll()
      expect(Object.keys(result)[0]).toEqual(adapters.osmosisToAssetId(osmo.denom))
    })

    it('should handle api errors', async () => {
      mockedAxios.get.mockRejectedValue({ error: 'foo' })
      const result = await osmosisMarketService.findAll()
      expect(Object.keys(result).length).toEqual(0)
    })

    it('should handle rate limiting', async () => {
      mockedAxios.get.mockResolvedValue({ status: 429 })
      const result = await osmosisMarketService.findAll()
      expect(Object.keys(result).length).toEqual(0)
    })
  })

  describe('findByAssetId', () => {
    it('should return market data for Secret Network', async () => {
      const args = {
        assetId:
          'cosmos:osmosis-1/ibc:0954E1C28EB7AF5B72D24F3BC2B47BBB2FDF91BDDFD57B74B99E133AED40972A'
      }
      const result: MarketData = {
        price: '4.5456667708',
        marketCap: '17581752.09948758',
        volume: '3289855.395915219',
        changePercent24Hr: -15.4199369882
      }

      mockedAxios.get.mockResolvedValue({ data: [secretNetwork] })
      expect(await osmosisMarketService.findByAssetId(args)).toEqual(result)
    })

    it('should return market data for Ion', async () => {
      const args = { assetId: 'cosmos:osmosis-1/native:uion' }
      const result: MarketData = {
        price: '7110.2708806483',
        marketCap: '8737040.33551496',
        volume: '353672.5116333088',
        changePercent24Hr: -15.5060091033
      }
      mockedAxios.get.mockResolvedValue({ data: [ion] })
      expect(await osmosisMarketService.findByAssetId(args)).toEqual(result)
    })

    it('should return market data for Osmosis', async () => {
      const args = { assetId: 'cosmos:osmosis-1/slip44:118' }
      const result: MarketData = {
        price: '8.0939512289',
        marketCap: '513382677.98398143',
        volume: '169020038.66921267',
        changePercent24Hr: -8.5460553557
      }
      mockedAxios.get.mockResolvedValue({ data: [osmo] })
      expect(await osmosisMarketService.findByAssetId(args)).toEqual(result)
    })
  })

  describe('findPriceHistoryByAssetId', () => {
    it('should return market data for OSMO (v1 endpoint)', async () => {
      const args = {
        assetId: 'cosmos:osmosis-1/slip44:118',
        timeframe: HistoryTimeframe.HOUR
      }

      const expected = [
        { date: new Date('2022-02-19T14:00:00.000Z').valueOf(), price: 8.7099702887 },
        { date: new Date('2022-02-19T15:00:00.000Z').valueOf(), price: 8.720258958 },
        { date: new Date('2022-02-19T16:00:00.000Z').valueOf(), price: 8.7551263817 },
        { date: new Date('2022-02-19T17:00:00.000Z').valueOf(), price: 8.7544961127 }
      ]
      mockedAxios.get.mockResolvedValue({ data: mockHourlyHistoryData })
      expect(await osmosisMarketService.findPriceHistoryByAssetId(args)).toEqual(expected)
    })

    it('should return market data for OSMO (v2 endpoint)', async () => {
      const args = {
        assetId: 'cosmos:osmosis-1/slip44:118',
        timeframe: HistoryTimeframe.YEAR
      }

      const expected = [
        { date: new Date('2021-06-24T00:00:00.000Z').valueOf(), price: 5.4010989774 },
        { date: new Date('2021-06-25T00:00:00.000Z').valueOf(), price: 7.3442392291 },
        { date: new Date('2021-06-26T00:00:00.000Z').valueOf(), price: 6.2011885916 },
        { date: new Date('2021-06-27T00:00:00.000Z').valueOf(), price: 5.3994292528 }
      ]
      mockedAxios.get.mockResolvedValue({ data: mockOsmosisYearlyHistoryData })
      expect(await osmosisMarketService.findPriceHistoryByAssetId(args)).toEqual(expected)
    })

    it('should return null on network error', async () => {
      const args = {
        assetId: 'cosmos:osmosis-1/slip44:118',
        timeframe: HistoryTimeframe.YEAR
      }
      mockedAxios.get.mockRejectedValue(Error)
      jest.spyOn(console, 'warn').mockImplementation(() => void 0)
      await expect(osmosisMarketService.findPriceHistoryByAssetId(args)).rejects.toEqual(
        new Error('MarketService(findPriceHistoryByAssetId): error fetching price history')
      )
    })
  })
})
