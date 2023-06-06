import type { HistoryData, MarketData } from '@shapeshiftoss/types'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import axios from 'axios'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { bnOrZero } from 'lib/bignumber/bignumber'

import type { FiatMarketService } from '../api'
import type {
  FiatMarketDataArgs,
  FiatPriceHistoryArgs,
  SupportedFiatCurrencies,
} from '../fiat-market-service-types'
import type { ExchangeRateHostHistoryData, ExchangeRateHostRate } from './exchange-rates-host-types'

const baseCurrency = 'USD'

export const makeExchangeRateRequestUrls = (
  start: Dayjs,
  end: Dayjs,
  symbol: SupportedFiatCurrencies,
  baseUrl: string,
): string[] => {
  const daysBetween = end.diff(start, 'day')
  /**
   * https://exchangerate.host/#/#docs
   * Timeseries endpoint are for daily historical rates between two dates of your choice, with a maximum time frame of 366 days.
   */
  const maxDaysPerRequest = 366
  return Array(Math.ceil(daysBetween / maxDaysPerRequest))
    .fill(null)
    .map((_, i) => {
      const urlStart = start.add(i * maxDaysPerRequest, 'day')
      const maybeEnd = urlStart.add(maxDaysPerRequest - 1, 'day')
      const urlEnd = maybeEnd.isAfter(end) ? end : maybeEnd
      return `${baseUrl}/timeseries?base=${baseCurrency}&symbols=${symbol}&start_date=${urlStart.format(
        'YYYY-MM-DD',
      )}&end_date=${urlEnd.format('YYYY-MM-DD')}`
    })
}

export class ExchangeRateHostService implements FiatMarketService {
  baseUrl = 'https://api.exchangerate.host'
  findByFiatSymbol = async ({ symbol }: FiatMarketDataArgs): Promise<MarketData | null> => {
    try {
      const { data } = await axios.get<ExchangeRateHostRate>(
        `${this.baseUrl}/latest?base=${baseCurrency}&symbols=${symbol}`,
      )
      // we only need the price key in the `web`
      return {
        price: data.rates[symbol].toString(),
        marketCap: '0',
        changePercent24Hr: 0,
        volume: '0',
      }
    } catch (e) {
      console.warn(e)
      throw new Error('FiatMarketService(findByFiatSymbol): error fetching market data')
    }
  }

  findPriceHistoryByFiatSymbol = async ({
    symbol,
    timeframe,
  }: FiatPriceHistoryArgs): Promise<HistoryData[]> => {
    const end = dayjs().endOf('day')
    let start
    switch (timeframe) {
      case HistoryTimeframe.HOUR:
        // minimum granularity on upstream API is 1 day
        start = end.subtract(1, 'day')
        break
      case HistoryTimeframe.DAY:
        start = end.subtract(1, 'day')
        break
      case HistoryTimeframe.WEEK:
        start = end.subtract(1, 'week')
        break
      case HistoryTimeframe.MONTH:
        start = end.subtract(1, 'month')
        break
      case HistoryTimeframe.YEAR:
        start = end.subtract(1, 'year')
        break
      case HistoryTimeframe.ALL:
        start = end.subtract(5, 'years')
        break
      default:
        start = end
    }

    try {
      const urls: string[] = makeExchangeRateRequestUrls(start, end, symbol, this.baseUrl)

      const results = await Promise.all(
        urls.map(url => axios.get<ExchangeRateHostHistoryData>(url)),
      )

      return results.reduce<HistoryData[]>((acc, { data }) => {
        Object.entries(data.rates).forEach(([formattedDate, ratesObject]) => {
          const date = dayjs(formattedDate, 'YYYY-MM-DD').startOf('day').valueOf()
          const price = bnOrZero(ratesObject[symbol]).toNumber()
          // skip zero prices (current day rate gets returned as zero)
          price > 0 && acc.push({ date, price })
        })
        return acc
      }, [])
    } catch (e) {
      console.warn(e)
      throw new Error(
        'ExchangeRateHost(findPriceHistoryByFiatSymbol): error fetching price history',
      )
    }
  }
}
