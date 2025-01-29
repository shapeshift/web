import type { HistoryData, MarketData } from '@shapeshiftoss/types'
import { getHistoryTimeframeBounds } from '@shapeshiftoss/utils'
import Axios from 'axios'
import { setupCache } from 'axios-cache-interceptor'
import { getConfig } from 'config'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { bnOrZero } from 'lib/bignumber/bignumber'

import type { FiatMarketService } from '../api'
import { DEFAULT_CACHE_TTL_MS } from '../config'
import type {
  FiatMarketDataArgs,
  FiatPriceHistoryArgs,
  SupportedFiatCurrencies,
} from '../fiat-market-service-types'
import type { ExchangeRateHostHistoryData, ExchangeRateHostRate } from './exchange-rates-host-types'

const baseCurrency = 'USD'

const axios = setupCache(Axios.create(), { ttl: DEFAULT_CACHE_TTL_MS, cacheTakeover: false })

export const makeExchangeRateRequestUrls = (
  start: Dayjs,
  end: Dayjs,
  symbol: SupportedFiatCurrencies,
  baseUrl: string,
  apiKey: string,
): string[] => {
  const daysBetween = end.diff(start, 'day')
  /**
   * https://exchangerate.host/documentation
   * Timeframe endpoint are for daily historical rates between two dates of your choice, with a maximum time frame of 366 days.
   */
  const maxDaysPerRequest = 366
  return Array(Math.ceil(daysBetween / maxDaysPerRequest))
    .fill(null)
    .map((_, i) => {
      const urlStart = start.add(i * maxDaysPerRequest, 'day')
      const maybeEnd = urlStart.add(maxDaysPerRequest - 1, 'day')
      const urlEnd = maybeEnd.isAfter(end) ? end : maybeEnd
      return `${baseUrl}/timeframe?access_key=${apiKey}&source=${baseCurrency}&currencies=${symbol}&start_date=${urlStart.format(
        'YYYY-MM-DD',
      )}&end_date=${urlEnd.format('YYYY-MM-DD')}`
    })
}

export class ExchangeRateHostService implements FiatMarketService {
  baseUrl = getConfig().REACT_APP_EXCHANGERATEHOST_BASE_URL
  apiKey = getConfig().REACT_APP_EXCHANGERATEHOST_API_KEY
  findByFiatSymbol = async ({ symbol }: FiatMarketDataArgs): Promise<MarketData | null> => {
    try {
      const { data } = await axios.get<ExchangeRateHostRate>(
        `${this.baseUrl}/live?access_key=${this.apiKey}&source=${baseCurrency}&currenciess=${symbol}`,
      )
      // we only need the price key in the `web`
      return {
        price: data.quotes[baseCurrency + symbol].toString(),
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
    const { start, end } = getHistoryTimeframeBounds(timeframe)

    try {
      const urls: string[] = makeExchangeRateRequestUrls(
        start,
        end,
        symbol,
        this.baseUrl,
        this.apiKey,
      )

      const results = await Promise.all(
        urls.map(url => axios.get<ExchangeRateHostHistoryData>(url)),
      )

      return results.reduce<HistoryData[]>((acc, { data }) => {
        Object.entries(data.quotes).forEach(([formattedDate, ratesObject]) => {
          const date = dayjs(formattedDate, 'YYYY-MM-DD').startOf('day').valueOf()
          const price = bnOrZero(ratesObject[data.source + symbol]).toNumber()
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
