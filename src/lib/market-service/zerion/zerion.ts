import {
  ASSET_NAMESPACE,
  type AssetId,
  bscChainId,
  type ChainId,
  fromAssetId,
  toAssetId,
} from '@shapeshiftoss/caip'
import {
  type FindAllMarketArgs,
  type HistoryData,
  HistoryTimeframe,
  type MarketCapResult,
  type MarketData,
  type MarketDataArgs,
  type PriceHistoryArgs,
  ZERION_CHAINS_MAP,
} from '@shapeshiftoss/types'
import Axios from 'axios'
import { setupCache } from 'axios-cache-interceptor'
import { getConfig } from 'config'
import qs from 'qs'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { assertUnreachable, isToken } from 'lib/utils'

import type { MarketService } from '../api'
import { DEFAULT_CACHE_TTL_MS } from '../config'
import { createThrottle } from '../utils'
import type {
  ListFungiblesResponse,
  ZerionChartResponse,
  ZerionFungibles,
  ZerionMarketData,
} from './types'
import { zerionMarketDataToMarketData } from './utils'

const { throttle, clear } = createThrottle({
  capacity: 1000, // Production keys are stated to have "200+ RPS"
  costPerReq: 1,
  drainPerInterval: 125, // Replenish 125 requests every 15 seconds
  intervalMs: 15000, // 15 seconds
})

const axios = setupCache(Axios.create(), { ttl: DEFAULT_CACHE_TTL_MS, cacheTakeover: false })

export class ZerionMarketService implements MarketService {
  baseUrl = getConfig().REACT_APP_ZERION_BASE_URL

  private readonly defaultGetByMarketCapArgs: FindAllMarketArgs = {
    count: 250,
  }

  getZerionTokenMarketData = async (assetId: AssetId): Promise<ZerionMarketData | undefined> => {
    const { assetReference } = fromAssetId(assetId)
    if (!isToken(assetReference)) return undefined

    const url = `${this.baseUrl}/fungibles/${assetReference}`
    const { data: res } = await axios.get<ZerionFungibles>(url)
    return res.data.attributes.market_data
  }

  getZerionPriceHistory = async ({
    assetId,
    timeframe,
  }: PriceHistoryArgs): Promise<ZerionChartResponse | null> => {
    const { assetReference } = fromAssetId(assetId)
    if (!isToken(assetReference)) return null

    const period = (() => {
      switch (timeframe) {
        case HistoryTimeframe.HOUR:
          return 'hour'
        case HistoryTimeframe.DAY:
          return 'day'
        case HistoryTimeframe.WEEK:
          return 'week'
        case HistoryTimeframe.MONTH:
          return 'month'
        case HistoryTimeframe.YEAR:
          return 'year'
        case HistoryTimeframe.ALL:
          return 'max'
        default:
          assertUnreachable(timeframe)
      }
    })()

    const url = `${this.baseUrl}/fungibles/${assetReference}/charts/${period}`
    const { data: res } = await axios.get<ZerionChartResponse>(url)
    return res
  }

  async findAll(args: FindAllMarketArgs): Promise<MarketCapResult> {
    const argsToUse = { ...this.defaultGetByMarketCapArgs, ...args }
    const { count } = argsToUse
    const url = `${this.baseUrl}/fungibles/`

    const marketCapResult: MarketCapResult = {}

    try {
      await Promise.all(
        Object.entries(ZERION_CHAINS_MAP).map(async ([zerionChainId, chainId]) => {
          if (Object.keys(marketCapResult).length >= count) return
          await throttle()

          const params = {
            sort: 'market_data.market_cap',
            'filter[implementation_chain_id]': zerionChainId,
            // Only fetch a single page for each chain, to avoid Avalanche/Ethereum assets eating all the 1000 count passed by web
            'page[size]': 100, // 0 to 100
          }

          const { data } = await axios.get<ListFungiblesResponse>(url, {
            paramsSerializer: params => qs.stringify(params, { arrayFormat: 'repeat' }),
            params,
          })

          for (const token of data.data) {
            if (Object.keys(marketCapResult).length >= count) break
            const marketData = token.attributes.market_data

            const assetId = toAssetId({
              chainId: chainId as ChainId,
              assetNamespace:
                chainId === bscChainId ? ASSET_NAMESPACE.bep20 : ASSET_NAMESPACE.erc20,
              assetReference: token.id,
            })

            marketCapResult[assetId] = {
              price: bnOrZero(marketData.price).toFixed(),
              marketCap: marketData.market_cap?.toFixed() ?? '0',
              volume: '0', // Not provided by Zerion
              changePercent24Hr: marketData.changes.percent_1d ?? 0,
              supply: marketData.circulating_supply?.toFixed() ?? undefined,
              maxSupply: marketData.total_supply?.toFixed() ?? undefined,
            }

            if (Object.keys(marketCapResult).length >= count) break
          }
        }),
      )

      return marketCapResult
    } catch (e) {
      console.error('Error fetching Zerion data:', e)
      return marketCapResult
    } finally {
      clear()
    }
  }

  async findPriceHistoryByAssetId({
    assetId,
    timeframe,
  }: PriceHistoryArgs): Promise<HistoryData[]> {
    const zerionPriceHistory = await this.getZerionPriceHistory({ assetId, timeframe })
    if (!zerionPriceHistory)
      throw new Error('MarketService(findPriceHistoryByAssetId): error fetching price history')

    return zerionPriceHistory.data.attributes.points.map(([date, price]) => ({
      date: date * 1000,
      price,
    }))
  }

  async findByAssetId({ assetId }: MarketDataArgs): Promise<MarketData | null> {
    try {
      const zerionMarketData = await this.getZerionTokenMarketData(assetId)
      if (!zerionMarketData)
        throw new Error('MarketService(findByAssetId): error fetching market data')

      return zerionMarketDataToMarketData(zerionMarketData)
    } catch (e) {
      throw new Error(`MarketService(findByAssetId): error fetching market data: ${e}`)
    }
  }
}
