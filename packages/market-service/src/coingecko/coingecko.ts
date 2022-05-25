import { adapters, CHAIN_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import {
  ChainTypes,
  FindAllMarketArgs,
  HistoryData,
  HistoryTimeframe,
  MarketCapResult,
  MarketData,
  MarketDataArgs,
  PriceHistoryArgs
} from '@shapeshiftoss/types'
import dayjs from 'dayjs'
import omit from 'lodash/omit'

import { MarketService } from '../api'
import { RATE_LIMIT_THRESHOLDS_PER_MINUTE } from '../config'
import { bn, bnOrZero } from '../utils/bignumber'
import { isValidDate } from '../utils/isValidDate'
import { rateLimitedAxios } from '../utils/rateLimiters'
import { CoinGeckoMarketCap } from './coingecko-types'

const axios = rateLimitedAxios(RATE_LIMIT_THRESHOLDS_PER_MINUTE.COINGECKO)

// tons more params here: https://www.coingecko.com/en/api/documentation
type CoinGeckoAssetData = {
  chain: ChainTypes
  market_data: {
    current_price: { [key: string]: string }
    market_cap: { [key: string]: string }
    total_volume: { [key: string]: string }
    high_24h: { [key: string]: string }
    low_24h: { [key: string]: string }
    circulating_supply: string
    total_supply: string
    max_supply: string
    price_change_percentage_24h: number
  }
}

export class CoinGeckoMarketService implements MarketService {
  baseUrl = 'https://api.coingecko.com/api/v3'

  private readonly defaultGetByMarketCapArgs: FindAllMarketArgs = {
    count: 2500
  }

  findAll = async (args?: FindAllMarketArgs) => {
    const argsToUse = { ...this.defaultGetByMarketCapArgs, ...args }
    const { count } = argsToUse
    const perPage = count > 250 ? 250 : count
    const pages = Math.ceil(bnOrZero(count).div(perPage).toNumber())

    const urlAtPage = (page: number) =>
      `${this.baseUrl}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=false`
    const pageCount = Array(pages)
      .fill(0)
      .map((_v, i) => i + 1)
    try {
      const combined = (
        await Promise.all(
          pageCount.map(async (page) => axios.get<CoinGeckoMarketCap>(urlAtPage(page)))
        )
      ).flat()
      return combined
        .map(({ data }) => data ?? []) // filter out rate limited results
        .flat()
        .sort((a, b) => (a.market_cap_rank > b.market_cap_rank ? 1 : -1))
        .reduce((acc, cur) => {
          const { id } = cur
          try {
            const assetId = adapters.coingeckoToAssetId(id)
            if (!assetId) return acc
            const curWithoutId = omit(cur, 'id') // don't leak this through to clients
            acc[assetId] = {
              price: curWithoutId.current_price.toString(),
              marketCap: curWithoutId.market_cap.toString(),
              volume: curWithoutId.total_volume.toString(),
              changePercent24Hr: curWithoutId.price_change_percentage_24h,
              supply: curWithoutId.circulating_supply.toString(),
              maxSupply: curWithoutId.max_supply
                ? curWithoutId.max_supply.toString()
                : curWithoutId.total_supply?.toString()
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

  findByAssetId = async ({ assetId }: MarketDataArgs): Promise<MarketData | null> => {
    try {
      if (!adapters.assetIdToCoingecko(assetId)) return null
      const { chainNamespace, assetReference } = fromAssetId(assetId)
      const isToken = chainNamespace === CHAIN_NAMESPACE.Ethereum && assetReference.startsWith('0x')
      const id = isToken ? 'ethereum' : adapters.assetIdToCoingecko(assetId)
      const contractUrl = isToken ? `/contract/${assetReference}` : ''

      const { data }: { data: CoinGeckoAssetData } = await axios.get(
        `${this.baseUrl}/coins/${id}${contractUrl}`
      )

      const currency = 'usd'
      const marketData = data?.market_data
      /* max_supply may be null on coingecko while available on other sources (coincap)
      hence choosing to take value from total_supply if existing
      Also a lot of time when max_supply is null, total_supply is the maximum supply on coingecko
      We can reassess in the future the degree of precision we want on that field */
      return {
        price: marketData?.current_price?.[currency],
        marketCap: marketData?.market_cap?.[currency],
        changePercent24Hr: marketData?.price_change_percentage_24h,
        volume: marketData?.total_volume?.[currency],
        supply: marketData?.circulating_supply,
        maxSupply: marketData?.max_supply
          ? marketData?.max_supply
          : marketData?.total_supply?.toString()
      }
    } catch (e) {
      console.warn(e)
      throw new Error('CoinGeckoMarketService(findByAssetId): error fetching market data')
    }
  }

  findPriceHistoryByAssetId = async ({
    assetId,
    timeframe
  }: PriceHistoryArgs): Promise<HistoryData[]> => {
    if (!adapters.assetIdToCoingecko(assetId)) return []
    try {
      const { chainNamespace, assetReference } = fromAssetId(assetId)
      const isToken = chainNamespace === CHAIN_NAMESPACE.Ethereum && assetReference.startsWith('0x')
      const id = isToken ? 'ethereum' : adapters.assetIdToCoingecko(assetId)
      const contract = isToken ? `/contract/${assetReference}` : ''

      const end = dayjs().startOf('minute')
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

      const from = start.valueOf() / 1000
      const to = end.valueOf() / 1000
      const url = `${this.baseUrl}/coins/${id}${contract}`
      type CoinGeckoHistoryData = {
        prices: [number, number][]
      }

      const currency = 'usd'
      const { data: historyData } = await axios.get<CoinGeckoHistoryData>(
        `${url}/market_chart/range?id=${id}&vs_currency=${currency}&from=${from}&to=${to}`
      )
      return historyData?.prices?.reduce<HistoryData[]>((acc, data) => {
        const date = data[0]
        if (!isValidDate(date)) {
          console.error('Coingecko asset has invalid date')
          return acc
        }
        const price = bn(data[1])
        if (price.isNaN()) {
          console.error('Coingecko asset has invalid price')
          return acc
        }
        acc.push({
          date: data[0],
          price: price.toNumber()
        })
        return acc
      }, [])
    } catch (e) {
      console.warn(e)
      throw new Error(
        'CoinGeckoMarketService(findPriceHistoryByAssetId): error fetching price history'
      )
    }
  }
}
