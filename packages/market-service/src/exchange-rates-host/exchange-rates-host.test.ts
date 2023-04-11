import { HistoryTimeframe } from '@shapeshiftoss/types'
import axios from 'axios'
import dayjs from 'dayjs'

import type { FiatMarketDataArgs, FiatPriceHistoryArgs } from '../fiat-market-service-types'
import { mockERHFindByFiatSymbol, mockERHPriceHistoryData } from './erhMockData'
import { ExchangeRateHostService, makeExchangeRateRequestUrls } from './exchange-rates-host'
import type { ExchangeRateHostRate } from './exchange-rates-host-types'

jest.mock('axios')

const mockedAxios = axios as jest.Mocked<typeof axios>
const exchangeRateHostService = new ExchangeRateHostService()

describe('ExchangeRateHostService', () => {
  const mockDay = '2020-12-31'
  const mockTime = 'T12:00:00.000Z'
  const mockDate = `${mockDay}${mockTime}`
  beforeEach(() => jest.useFakeTimers().setSystemTime(new Date(mockDate)))
  afterEach(() => {
    jest.restoreAllMocks()
    jest.useRealTimers()
  })

  describe('findByFiatSymbol', () => {
    const args: FiatMarketDataArgs = {
      symbol: 'EUR',
    }

    const eurRate: ExchangeRateHostRate = {
      rates: {
        EUR: 0.91,
      },
    }

    it('should return fiat market data for EUR', async () => {
      mockedAxios.get.mockResolvedValue({ data: eurRate })
      expect(await exchangeRateHostService.findByFiatSymbol(args)).toEqual(mockERHFindByFiatSymbol)
    })

    it('should return null on network error', async () => {
      mockedAxios.get.mockRejectedValue(Error)
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => void 0)
      await expect(exchangeRateHostService.findByFiatSymbol(args)).rejects.toEqual(
        new Error('FiatMarketService(findByFiatSymbol): error fetching market data'),
      )
      expect(consoleSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('findPriceHistoryByFiatSymbol', () => {
    const args: FiatPriceHistoryArgs = {
      symbol: 'EUR',
      timeframe: HistoryTimeframe.WEEK,
    }

    const data = {
      rates: {
        '2020-01-01': { EUR: 0.891186 },
        '2020-01-02': { EUR: 0.891186 },
        '2020-01-03': { EUR: 0.895175 },
        '2020-01-04': { EUR: 0.895175 },
      },
    }

    it('should return historical fiat market data for EUR', async () => {
      mockedAxios.get.mockResolvedValue({ data })
      expect(await exchangeRateHostService.findPriceHistoryByFiatSymbol(args)).toEqual(
        mockERHPriceHistoryData,
      )
    })

    it('should return null on network error', async () => {
      mockedAxios.get.mockRejectedValue(Error)
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => void 0)
      await expect(exchangeRateHostService.findPriceHistoryByFiatSymbol(args)).rejects.toEqual(
        new Error('ExchangeRateHost(findPriceHistoryByFiatSymbol): error fetching price history'),
      )
      expect(consoleSpy).toHaveBeenCalledTimes(1)
    })

    it('should have different start and end dates for hour timeframe', async () => {
      mockedAxios.get.mockResolvedValue({ data })

      await exchangeRateHostService.findPriceHistoryByFiatSymbol({
        symbol: 'EUR',
        timeframe: HistoryTimeframe.HOUR,
      })
      expect(mockedAxios.get).toBeCalledWith(
        `https://api.exchangerate.host/timeseries?base=USD&symbols=EUR&start_date=2020-12-30&end_date=${mockDay}`,
      )
    })

    it('should have different and sensible dates for day timeframe', async () => {
      mockedAxios.get.mockResolvedValue({ data })

      await exchangeRateHostService.findPriceHistoryByFiatSymbol({
        symbol: 'EUR',
        timeframe: HistoryTimeframe.DAY,
      })
      expect(mockedAxios.get).toBeCalledWith(
        `https://api.exchangerate.host/timeseries?base=USD&symbols=EUR&start_date=2020-12-30&end_date=${mockDay}`,
      )
    })

    it('should have different and sensible dates for week timeframe', async () => {
      mockedAxios.get.mockResolvedValue({ data })

      await exchangeRateHostService.findPriceHistoryByFiatSymbol({
        symbol: 'EUR',
        timeframe: HistoryTimeframe.WEEK,
      })
      expect(mockedAxios.get).toBeCalledWith(
        `https://api.exchangerate.host/timeseries?base=USD&symbols=EUR&start_date=2020-12-24&end_date=${mockDay}`,
      )
    })
  })
})

describe('makeExchangeRateRequestUrls', () => {
  it('should make one url', () => {
    const start = dayjs('2020-01-01')
    const end = dayjs('2020-01-02')
    const symbol = 'EUR'
    const baseUrl = 'https://api.exchangeratesapi.io'
    expect(makeExchangeRateRequestUrls(start, end, symbol, baseUrl)).toEqual([
      'https://api.exchangeratesapi.io/timeseries?base=USD&symbols=EUR&start_date=2020-01-01&end_date=2020-01-02',
    ])
  })

  it('should make five urls', () => {
    const start = dayjs('2017-05-20')
    const end = dayjs('2022-05-17')
    const symbol = 'EUR'
    const baseUrl = 'https://api.exchangeratesapi.io'
    expect(makeExchangeRateRequestUrls(start, end, symbol, baseUrl)).toEqual([
      'https://api.exchangeratesapi.io/timeseries?base=USD&symbols=EUR&start_date=2017-05-20&end_date=2018-05-20',
      'https://api.exchangeratesapi.io/timeseries?base=USD&symbols=EUR&start_date=2018-05-21&end_date=2019-05-21',
      'https://api.exchangeratesapi.io/timeseries?base=USD&symbols=EUR&start_date=2019-05-22&end_date=2020-05-21',
      'https://api.exchangeratesapi.io/timeseries?base=USD&symbols=EUR&start_date=2020-05-22&end_date=2021-05-22',
      'https://api.exchangeratesapi.io/timeseries?base=USD&symbols=EUR&start_date=2021-05-23&end_date=2022-05-17',
    ])
  })
})
