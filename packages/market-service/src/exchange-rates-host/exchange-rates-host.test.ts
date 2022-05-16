import { HistoryTimeframe } from '@shapeshiftoss/types'
import axios from 'axios'

import { FiatMarketDataArgs, FiatPriceHistoryArgs } from '../fiat-market-service-types'
import { mockERHFindByFiatSymbol, mockERHPriceHistoryData } from './erhMockData'
import { ExchangeRateHostService } from './exchange-rates-host'
import { ExchangeRateHostRate } from './exchange-rates-host-types'

jest.mock('axios')

const mockedAxios = axios as jest.Mocked<typeof axios>
const exchangeRateHostService = new ExchangeRateHostService()

describe('ExchangeRateHostService', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('findByFiatSymbol', () => {
    const args: FiatMarketDataArgs = {
      symbol: 'EUR'
    }

    const eurRate: ExchangeRateHostRate = {
      rates: {
        EUR: 0.91
      }
    }

    it('should return fiat market data for EUR', async () => {
      mockedAxios.get.mockResolvedValue({ data: eurRate })
      expect(await exchangeRateHostService.findByFiatSymbol(args)).toEqual(mockERHFindByFiatSymbol)
    })

    it('should return null on network error', async () => {
      mockedAxios.get.mockRejectedValue(Error)
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => void 0)
      await expect(exchangeRateHostService.findByFiatSymbol(args)).rejects.toEqual(
        new Error('FiatMarketService(findByFiatSymbol): error fetching market data')
      )
      expect(consoleSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('findPriceHistoryByFiatSymbol', () => {
    const args: FiatPriceHistoryArgs = {
      symbol: 'EUR',
      timeframe: HistoryTimeframe.WEEK
    }

    it('should return historical fiat market data for EUR', async () => {
      const mockHistoryData = {
        rates: {
          '2020-01-01': { EUR: 0.891186 },
          '2020-01-02': { EUR: 0.891186 },
          '2020-01-03': { EUR: 0.895175 },
          '2020-01-04': { EUR: 0.895175 }
        }
      }

      mockedAxios.get.mockResolvedValue({ data: mockHistoryData })
      expect(await exchangeRateHostService.findPriceHistoryByFiatSymbol(args)).toEqual(
        mockERHPriceHistoryData
      )
    })

    it('should return null on network error', async () => {
      mockedAxios.get.mockRejectedValue(Error)
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => void 0)
      await expect(exchangeRateHostService.findPriceHistoryByFiatSymbol(args)).rejects.toEqual(
        new Error('ExchangeRateHost(findPriceHistoryByFiatSymbol): error fetching price history')
      )
      expect(consoleSpy).toHaveBeenCalledTimes(1)
    })
  })
})
