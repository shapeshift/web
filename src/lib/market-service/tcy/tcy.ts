import { tcyAssetId } from '@shapeshiftoss/caip'
import type { ThornodePoolResponse } from '@shapeshiftoss/swapper'
import type { MarketData, MarketDataArgs } from '@shapeshiftoss/types'
import axios from 'axios'

import type { MarketService } from '../api'

import { getConfig } from '@/config'
import { fromBaseUnit } from '@/lib/math'
import { THOR_PRECISION } from '@/lib/utils/thorchain/constants'

export class TcyMarketService implements MarketService {
  baseUrl = getConfig().VITE_THORCHAIN_NODE_URL

  async findAll() {
    try {
      const assetId = tcyAssetId
      const marketData = await this.findByAssetId({ assetId })

      return { [assetId]: marketData } as Record<string, MarketData>
    } catch (e) {
      console.warn(e)
      return {}
    }
  }

  async findByAssetId({ assetId }: MarketDataArgs): Promise<MarketData | null> {
    try {
      if (assetId !== tcyAssetId) {
        return null
      }

      const response = await axios.get<ThornodePoolResponse>(
        `${this.baseUrl}/thorchain/pool/THOR.TCY`,
      )
      const data = response.data

      return {
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
