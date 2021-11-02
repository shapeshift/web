import {
  GetByMarketCapType,
  HistoryData,
  MarketDataArgs,
  MarketDataType,
  PriceHistoryArgs,
  PriceHistoryType
} from '@shapeshiftoss/types'
import { GetByMarketCapArgs } from '@shapeshiftoss/types/src'

import { MarketService } from './api'
import { CoinGeckoMarketService } from './coingecko/coingecko'

export const getDefaultMarketService = (): MarketService => {
  return new CoinGeckoMarketService()
}

export const getByMarketCap: GetByMarketCapType = async (args?: GetByMarketCapArgs) => {
  return getDefaultMarketService().getByMarketCap(args)
}

export const getMarketData: MarketDataType = async ({ chain, tokenId }: MarketDataArgs) => {
  return getDefaultMarketService().getMarketData({ chain, tokenId })
}

export const getPriceHistory: PriceHistoryType = ({
  chain,
  timeframe,
  tokenId
}: PriceHistoryArgs): Promise<HistoryData[]> => {
  return getDefaultMarketService().getPriceHistory({ chain, timeframe, tokenId })
}
