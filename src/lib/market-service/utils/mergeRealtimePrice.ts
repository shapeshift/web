import type { MarketData } from '@shapeshiftoss/types'

import { bnOrZero } from '@/lib/bignumber/bignumber'

export interface EnhancedMarketData extends MarketData {
  isRealtime: boolean
}

/**
 * Merges market data with realtime price, recalculating market cap and volume
 * based on the realtime price when available
 */
export function mergeRealtimePrice(
  marketData: MarketData | null,
  realtimePrice: string | null,
): EnhancedMarketData | null {
  if (!marketData) return null

  // If no realtime price, return original data marked as not realtime
  if (!realtimePrice) {
    return {
      ...marketData,
      isRealtime: false,
    }
  }

  const realtimePriceBn = bnOrZero(realtimePrice)
  const originalPriceBn = bnOrZero(marketData.price)

  // If original price is 0 or prices are the same, don't use realtime
  if (originalPriceBn.isZero() || realtimePriceBn.eq(originalPriceBn)) {
    return {
      ...marketData,
      isRealtime: false,
    }
  }

  // Calculate new market cap: supply * realtime price
  const newMarketCap = bnOrZero(marketData.supply).times(realtimePriceBn).toString()

  // Calculate unit volume from original data: volume / original_price
  const unitVolume = bnOrZero(marketData.volume).div(originalPriceBn)

  // Calculate new volume: unit_volume * realtime_price
  const newVolume = unitVolume.times(realtimePriceBn).toString()

  return {
    ...marketData,
    price: realtimePrice,
    marketCap: newMarketCap,
    volume: newVolume,
    isRealtime: true,
  }
}
