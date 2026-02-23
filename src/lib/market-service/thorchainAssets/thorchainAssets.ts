import { rujiAssetId, tcyAssetId } from '@shapeshiftoss/caip'
import type { ThornodePoolResponse } from '@shapeshiftoss/swapper'
import { assetIdToThorPoolAssetId } from '@shapeshiftoss/swapper'
import type { MarketData, MarketDataArgs } from '@shapeshiftoss/types'
import axios from 'axios'

import type { MarketService } from '../api'

import { getConfig } from '@/config'
import { fromBaseUnit } from '@/lib/math'
import { THOR_PRECISION } from '@/lib/utils/thorchain/constants'

const supportedAssetIds = [tcyAssetId, rujiAssetId]

export class ThorchainAssetsMarketService implements MarketService {
  baseUrl = getConfig().VITE_THORCHAIN_NODE_URL

  async findAll() {
    try {
      const assetIds = supportedAssetIds
      const marketDataResults = await Promise.all(
        assetIds.map(assetId => this.findByAssetId({ assetId })),
      )

      return marketDataResults.reduce(
        (acc, marketData, index) => {
          if (!marketData) return acc

          acc[assetIds[index]] = marketData

          return acc
        },
        {} as Record<string, MarketData>,
      )
    } catch (e) {
      console.warn(e)
      return {}
    }
  }

  async findByAssetId({ assetId }: MarketDataArgs): Promise<MarketData | null> {
    try {
      if (!supportedAssetIds.includes(assetId)) return null

      const poolAssetId = assetIdToThorPoolAssetId({ assetId })
      if (!poolAssetId) return null

      const response = await axios.get<ThornodePoolResponse>(
        `${this.baseUrl}/thorchain/pool/${poolAssetId}`,
      )
      const data = response.data

      return {
        // Both THORChain native assets we support so far use 8dp, and all others probably do too
        price: fromBaseUnit(data.asset_tor_price, THOR_PRECISION),
        marketCap: '0',
        volume: '0',
        changePercent24Hr: 0,
      }
    } catch (e) {
      console.warn(e)
      throw new Error('TcyMarketService(findByAssetId): error fetching market data')
    }
  }

  findPriceHistoryByAssetId() {
    return Promise.resolve([])
  }
}
