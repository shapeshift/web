import { tcyAssetId } from '@shapeshiftoss/caip'
import type { MidgardPoolResponse } from '@shapeshiftoss/swapper'
import type { MarketData, MarketDataArgs } from '@shapeshiftoss/types'
import { fromBaseUnit } from '@shapeshiftoss/utils'
import axios from 'axios'

import type { MarketService } from '../api'

import { getConfig } from '@/config'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { THOR_PRECISION } from '@/lib/utils/thorchain/constants'

export class TcyMarketService implements MarketService {
  baseUrl = getConfig().VITE_THORCHAIN_MIDGARD_URL

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

      const response = await axios.get<MidgardPoolResponse>(`${this.baseUrl}/pool/THOR.TCY`)
      const data = response.data

      const marketCap = bnOrZero(fromBaseUnit(data.assetDepth, THOR_PRECISION))
        .times(data.assetPriceUSD)
        .toString()

      return {
        price: data.assetPriceUSD,
        marketCap,
        volume: '0',
        changePercent24Hr: 0,
      }
    } catch (e) {
      console.warn(e)
      throw new Error('TcyMarketService(findByAssetId): error fetching market data')
    }
  }

  async findPriceHistoryByAssetId() {
    return []
  }
}
