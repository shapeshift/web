import { type AssetId, fromAssetId } from '@shapeshiftoss/caip'
import type {
  FindAllMarketArgs,
  HistoryData,
  MarketCapResult,
  MarketData,
  MarketDataArgs,
  PriceHistoryArgs,
} from '@shapeshiftoss/types'
import Axios from 'axios'
import { setupCache } from 'axios-cache-interceptor'

import type { MarketService } from '../api'
import { DEFAULT_CACHE_TTL_MS } from '../config'
import type { ZerionFungibles, ZerionMarketData } from './types'
import { zerionMarketDataToMarketData } from './utils'

const axios = setupCache(Axios.create(), { ttl: DEFAULT_CACHE_TTL_MS, cacheTakeover: false })

export class ZerionMarketService implements MarketService {
  baseUrl = 'https://zerion.shapeshift.com'

  getZerionTokenMarketData = async (assetId: AssetId): Promise<ZerionMarketData | undefined> => {
    const { assetReference } = fromAssetId(assetId)
    const url = `${this.baseUrl}/fungibles/${assetReference}`
    const { data: res } = await axios.get<ZerionFungibles>(url)
    return res.data.attributes.market_data
  }

  findAll(_args?: FindAllMarketArgs): Promise<MarketCapResult> {
    // TODO - unimplemented
    throw new Error('Zerion findAll unimplemented')
  }

  findPriceHistoryByAssetId({
    assetId: _assetId,
    timeframe: _timeframe,
  }: PriceHistoryArgs): Promise<HistoryData[]> {
    // TODO - unimplemented
    throw new Error('Zerion findPriceHistoryByAssetId unimplemented')
  }

  async findByAssetId({ assetId }: MarketDataArgs): Promise<MarketData | null> {
    try {
      const zerionMarketData = await this.getZerionTokenMarketData(assetId)
      if (!zerionMarketData) return null
      return zerionMarketDataToMarketData(zerionMarketData)
    } catch (e) {
      console.error(`MarketService(findByAssetId): error fetching market data: ${e}`)
      return null
    }
  }
}
