import type {
  FindAllMarketArgs,
  HistoryData,
  MarketCapResult,
  MarketData,
  MarketDataArgs,
  PriceHistoryArgs,
} from '@shapeshiftoss/types'

import type { MarketService } from '../api'

export class ZerionMarketService implements MarketService {
  baseUrl = 'https://zerion.shapeshift.com/'

  async findAll(_args?: FindAllMarketArgs): Promise<MarketCapResult> {
    // TODO
    return await Promise.resolve({})
  }

  async findPriceHistoryByAssetId({
    assetId: _assetId,
    timeframe: _timeframe,
  }: PriceHistoryArgs): Promise<HistoryData[]> {
    // TODO
    return await Promise.resolve([])
  }

  async findByAssetId({ assetId: _assetId }: MarketDataArgs): Promise<MarketData | null> {
    // TODO
    return await Promise.resolve(null)
  }
}
