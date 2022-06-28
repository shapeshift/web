import { adapters } from '@shapeshiftoss/caip'
import { Logger } from '@shapeshiftoss/logger'
import {
  FindAllMarketArgs,
  HistoryData,
  HistoryTimeframe,
  MarketCapResult,
  MarketData,
  MarketDataArgs,
  PriceHistoryArgs
} from '@shapeshiftoss/types'
import dayjs from 'dayjs'

import { MarketService } from '../api'
import { RATE_LIMIT_THRESHOLDS_PER_MINUTE } from '../config'
import { bn, bnOrZero } from '../utils/bignumber'
import { isValidDate } from '../utils/isValidDate'
import { rateLimitedAxios } from '../utils/rateLimiters'
import { CoinGeckoMarketCap, CoinGeckoMarketData } from './coingecko-types'

const logger = new Logger({
  namespace: ['market-service', 'coingecko'],
  level: process.env.LOG_LEVEL
})

const axios = rateLimitedAxios(RATE_LIMIT_THRESHOLDS_PER_MINUTE.COINGECKO)

// tons more params here: https://www.coingecko.com/en/api/documentation
type CoinGeckoAssetData = {
  chain: adapters.CoingeckoAssetPlatform
  market_data: CoinGeckoMarketData
}

type CoinGeckoHistoryData = {
  prices: [number, number][]
}

type CoinGeckoMarketServiceArgs = {
  coinGeckoAPIKey: string
}

export class CoinGeckoMarketService implements MarketService {
  private readonly maxPerPage = 250
  private readonly defaultCount = 2500

  baseUrl: string
  APIKey: string
  maybeApiKeyQueryParam: string

  constructor(args: CoinGeckoMarketServiceArgs) {
    this.APIKey = args.coinGeckoAPIKey
    const { baseUrl, maybeApiKeyQueryParam } = adapters.makeCoingeckoUrlParts(this.APIKey)
    this.baseUrl = baseUrl
    this.maybeApiKeyQueryParam = maybeApiKeyQueryParam
  }

  async findAll(args?: FindAllMarketArgs) {
    const count = args?.count ?? this.defaultCount
    const perPage = count < this.maxPerPage ? count : this.maxPerPage
    const pages = Math.ceil(bnOrZero(count).div(perPage).toNumber())

    const pageCount = Array(pages)
      .fill(0)
      .map((_v, i) => i + 1)

    try {
      const marketData = await Promise.all(
        pageCount.map(async (page) => {
          const { data } = await axios.get<CoinGeckoMarketCap>(
            `${this.baseUrl}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=false${this.maybeApiKeyQueryParam}`
          )
          return data ?? []
        })
      )

      return marketData.flat().reduce<MarketCapResult>((prev, asset) => {
        const assetId = adapters.coingeckoToAssetId(asset.id)
        if (!assetId) return prev

        prev[assetId] = {
          price: asset.current_price.toString(),
          marketCap: asset.market_cap.toString(),
          volume: asset.total_volume.toString(),
          changePercent24Hr: asset.price_change_percentage_24h,
          supply: asset.circulating_supply.toString(),
          maxSupply: asset.max_supply?.toString() ?? asset.total_supply?.toString()
        }

        return prev
      }, {})
    } catch (e) {
      return {}
    }
  }

  async findByAssetId({ assetId }: MarketDataArgs): Promise<MarketData | null> {
    if (!adapters.assetIdToCoingecko(assetId)) return null

    const url = adapters.makeCoingeckoAssetUrl(assetId, this.APIKey)
    if (!url) return null

    try {
      const { data } = await axios.get<CoinGeckoAssetData>(url)

      const currency = 'usd'
      const marketData = data?.market_data

      if (!marketData) return null

      /* max_supply may be null on coingecko while available on other sources (coincap)
      hence choosing to take value from total_supply if existing
      Also a lot of time when max_supply is null, total_supply is the maximum supply on coingecko
      We can reassess in the future the degree of precision we want on that field */
      return {
        price: bnOrZero(marketData.current_price?.[currency]).toString(),
        marketCap: bnOrZero(marketData.market_cap?.[currency]).toString(),
        changePercent24Hr: marketData.price_change_percentage_24h,
        volume: bnOrZero(marketData.total_volume?.[currency]).toString(),
        supply: bnOrZero(marketData.circulating_supply).toString(),
        maxSupply:
          marketData.max_supply?.toString() ?? marketData.total_supply?.toString() ?? undefined
      }
    } catch (e) {
      console.warn(e)
      throw new Error('CoinGeckoMarketService(findByAssetId): error fetching market data')
    }
  }

  async findPriceHistoryByAssetId({
    assetId,
    timeframe
  }: PriceHistoryArgs): Promise<HistoryData[]> {
    const fnLogger = logger.child({ fn: 'findPriceHistoryByAssetId', assetId, timeframe })

    if (!adapters.assetIdToCoingecko(assetId)) return []

    const url = adapters.makeCoingeckoAssetUrl(assetId, this.APIKey)
    if (!url) return []

    try {
      const end = dayjs().startOf('minute')
      const start = (() => {
        switch (timeframe) {
          case HistoryTimeframe.HOUR:
            return end.subtract(1, 'hour')
          case HistoryTimeframe.DAY:
            return end.subtract(1, 'day')
          case HistoryTimeframe.WEEK:
            return end.subtract(1, 'week')
          case HistoryTimeframe.MONTH:
            return end.subtract(1, 'month')
          case HistoryTimeframe.YEAR:
            return end.subtract(1, 'year')
          case HistoryTimeframe.ALL:
            return end.subtract(20, 'years')
          default:
            return end
        }
      })()

      const currency = 'usd'
      const from = start.valueOf() / 1000
      const to = end.valueOf() / 1000

      const [baseUrl, apiKeyQueryParam = ''] = url.split('?')

      const { data: historyData } = await axios.get<CoinGeckoHistoryData>(
        `${baseUrl}/market_chart/range?vs_currency=${currency}&from=${from}&to=${to}${apiKeyQueryParam}`
      )

      return historyData.prices.reduce<HistoryData[]>((prev, data) => {
        const [date, price] = data

        if (!isValidDate(date)) {
          fnLogger.error('invalid date')
          return prev
        }

        if (bn(price).isNaN()) {
          fnLogger.error('invalid price')
          return prev
        }

        prev.push({ date, price })
        return prev
      }, [])
    } catch (err) {
      fnLogger.error(err, 'failed to fetch price history')
      throw new Error(
        'CoinGeckoMarketService(findPriceHistoryByAssetId): error fetching price history'
      )
    }
  }
}
