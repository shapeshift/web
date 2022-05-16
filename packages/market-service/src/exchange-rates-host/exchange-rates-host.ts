import { HistoryData, HistoryTimeframe, MarketData } from '@shapeshiftoss/types'
import dayjs from 'dayjs'

import { FiatMarketService } from '../api'
import { RATE_LIMIT_THRESHOLDS_PER_MINUTE } from '../config'
import { FiatMarketDataArgs, FiatPriceHistoryArgs } from '../fiat-market-service-types'
import { bnOrZero } from '../utils/bignumber'
import { rateLimitedAxios } from '../utils/rateLimiters'
import { ExchangeRateHostHistoryData, ExchangeRateHostRate } from './exchange-rates-host-types'

const axios = rateLimitedAxios(RATE_LIMIT_THRESHOLDS_PER_MINUTE.DEFAULT)
const baseCurrency = 'USD'

export class ExchangeRateHostService implements FiatMarketService {
  baseUrl = 'https://api.exchangerate.host'
  findByFiatSymbol = async ({ symbol }: FiatMarketDataArgs): Promise<MarketData | null> => {
    try {
      const { data } = await axios.get<ExchangeRateHostRate>(
        `${this.baseUrl}/latest?base=${baseCurrency}&symbols=${symbol}`
      )
      // we only need the price key in the `web`
      return {
        price: data.rates[symbol].toString(),
        marketCap: '0',
        changePercent24Hr: 0,
        volume: '0'
      }
    } catch (e) {
      console.warn(e)
      throw new Error('FiatMarketService(findByFiatSymbol): error fetching market data')
    }
  }

  findPriceHistoryByFiatSymbol = async ({
    symbol,
    timeframe
  }: FiatPriceHistoryArgs): Promise<HistoryData[]> => {
    const end = dayjs().startOf('day')
    let start
    switch (timeframe) {
      case HistoryTimeframe.HOUR:
        start = end.subtract(1, 'hour')
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
        start = end.subtract(20, 'years')
        break
      default:
        start = end
    }

    try {
      const from = start.startOf('day').format('YYYY-MM-DD')
      const to = end.startOf('day').format('YYYY-MM-DD')
      const url = `${this.baseUrl}/timeseries?base=${baseCurrency}&symbols=${symbol}&start_date=${from}&end_date=${to}`

      const { data } = await axios.get<ExchangeRateHostHistoryData>(url)

      return Object.entries(data.rates).reduce<HistoryData[]>(
        (acc, [formattedDate, ratesObject]) => {
          const date = dayjs(formattedDate, 'YYYY-MM-DD').startOf('day').valueOf()
          const price = bnOrZero(ratesObject[symbol]).toNumber()
          acc.push({ date, price })
          return acc
        },
        []
      )
    } catch (e) {
      console.warn(e)
      throw new Error(
        'ExchangeRateHost(findPriceHistoryByFiatSymbol): error fetching price history'
      )
    }
  }
}
