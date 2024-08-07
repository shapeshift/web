import { type AssetId, fromAssetId } from '@shapeshiftoss/caip'
import {
  type FindAllMarketArgs,
  type HistoryData,
  HistoryTimeframe,
  type MarketCapResult,
  type MarketData,
  type MarketDataArgs,
  type PriceHistoryArgs,
} from '@shapeshiftoss/types'
import Axios from 'axios'
import { setupCache } from 'axios-cache-interceptor'
import { getConfig } from 'config'
import { assertUnreachable, isToken } from 'lib/utils'

import type { MarketService } from '../api'
import { DEFAULT_CACHE_TTL_MS } from '../config'
import type { ZerionChartResponse, ZerionFungibles, ZerionMarketData } from './types'
import { zerionMarketDataToMarketData } from './utils'

const axios = setupCache(Axios.create(), { ttl: DEFAULT_CACHE_TTL_MS, cacheTakeover: false })

export class ZerionMarketService implements MarketService {
  baseUrl = getConfig().REACT_APP_ZERION_BASE_URL

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

  findAll(_args?: FindAllMarketArgs): Promise<MarketCapResult> {
    // TODO - unimplemented
    throw new Error('Zerion findAll unimplemented')
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
