import { adapters } from '@shapeshiftoss/caip'
import type {
  FindAllMarketArgs,
  HistoryData,
  MarketCapResult,
  MarketData,
  MarketDataArgs,
  PriceHistoryArgs,
} from '@shapeshiftoss/types'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import axios from 'axios'
import dayjs from 'dayjs'
import omit from 'lodash/omit'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'

import type { MarketService } from '../api'
import { isValidDate } from '../utils/isValidDate'
import type { CoinCapMarketCap } from './coincap-types'

export class CoinCapMarketService implements MarketService {
  baseUrl = 'https://api.coincap.io/v2'

  private readonly defaultGetByMarketCapArgs: FindAllMarketArgs = {
    count: 2500,
  }

  async findAll(args?: FindAllMarketArgs) {
    const argsToUse = { ...this.defaultGetByMarketCapArgs, ...args }
    const { count } = argsToUse
    const perPage = count > 250 ? 250 : count
    const pages = Math.ceil(bnOrZero(count).div(perPage).toNumber())
    const urlAtPage = (page: number) => `${this.baseUrl}/assets?limit=${perPage}&offset=${page}`
    const pageCount = Array(pages)
      .fill(0)
      .map((_v, i) => i + 1)

    try {
      const combined = (
        await Promise.all(
          pageCount.map(page => axios.get<{ data: CoinCapMarketCap[] }>(urlAtPage(page))),
        )
      ).flat()

      return combined
        .map(({ data }) => (data && data.data ? data.data : [])) // filter out rate limited results
        .flat()
        .sort((a, b) => (a.rank > b.rank ? 1 : -1))
        .reduce((acc, cur) => {
          const { id } = cur
          try {
            const assetId = adapters.coincapToAssetId(id)
            if (!assetId) return acc
            const curWithoutId = omit(cur, 'id') // don't leak this through to clients
            acc[assetId] = {
              price: curWithoutId.priceUsd.toString(),
              marketCap: curWithoutId.marketCapUsd.toString(),
              volume: curWithoutId.volumeUsd24Hr.toString(),
              changePercent24Hr: parseFloat(curWithoutId.changePercent24Hr),
              supply: curWithoutId.supply,
              maxSupply: curWithoutId.maxSupply?.toString(),
            }

            return acc
          } catch {
            return acc // no AssetId found, we don't support this asset
          }
        }, {} as MarketCapResult)
    } catch (e) {
      return {}
    }
  }

  async findByAssetId({ assetId }: MarketDataArgs): Promise<MarketData | null> {
    if (!adapters.assetIdToCoinCap(assetId)) return null
    try {
      const id = adapters.assetIdToCoinCap(assetId)

      const { data } = await axios.get(`${this.baseUrl}/assets/${id}`)

      const marketData = data.data as CoinCapMarketCap
      return {
        price: marketData.priceUsd,
        marketCap: marketData.marketCapUsd,
        changePercent24Hr: parseFloat(marketData.changePercent24Hr),
        volume: marketData.volumeUsd24Hr,
        supply: marketData.supply,
        maxSupply: marketData.maxSupply?.toString(),
      }
    } catch (e) {
      throw new Error(`MarketService(findByAssetId): error fetching market data: ${e}`)
    }
  }

  async findPriceHistoryByAssetId({
    assetId,
    timeframe,
  }: PriceHistoryArgs): Promise<HistoryData[]> {
    if (!adapters.assetIdToCoinCap(assetId)) return []
    const id = adapters.assetIdToCoinCap(assetId)

    const end = dayjs().startOf('minute')
    let start
    let interval
    switch (timeframe) {
      case HistoryTimeframe.HOUR:
        start = end.subtract(1, 'hour')
        interval = 'm5'
        break
      case HistoryTimeframe.DAY:
        start = end.subtract(1, 'day')
        interval = 'h1'
        break
      case HistoryTimeframe.WEEK:
        start = end.subtract(1, 'week')
        interval = 'd1'
        break
      case HistoryTimeframe.MONTH:
        start = end.subtract(1, 'month')
        interval = 'd1'
        break
      case HistoryTimeframe.YEAR:
        start = end.subtract(1, 'year')
        interval = 'd1'
        break
      case HistoryTimeframe.ALL:
        start = end.subtract(20, 'years')
        interval = 'd1'
        break
      default:
        start = end
    }

    try {
      const from = start.valueOf()
      const to = end.valueOf()
      const url = `${this.baseUrl}/assets/${id}/history`
      type CoincapHistoryData = {
        data: {
          priceUsd: number
          time: number
        }[]
      }
      const {
        data: { data: coincapData },
      } = await axios.get<CoincapHistoryData>(
        `${url}?id=${id}&start=${from}&end=${to}&interval=${interval}`,
      )

      return coincapData.reduce<HistoryData[]>((acc, current) => {
        const date = current.time
        if (!isValidDate(date)) {
          console.error('Coincap asset history data has invalid date')
          return acc
        }
        const price = bn(current.priceUsd)
        if (price.isNaN()) {
          console.error('Coincap asset history data has invalid price')
          return acc
        }
        acc.push({
          date,
          price: price.toNumber(),
        })
        return acc
      }, [])
    } catch (e) {
      console.warn(e, '')
      throw new Error('MarketService(findPriceHistoryByAssetId): error fetching price history')
    }
  }
}
