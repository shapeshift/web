import { CoinGeckoMarketService } from './coingecko/coingecko'
import * as api from './api'

export * from './api'

export const getDefaultMarketService = (): api.MarketService => {
  return new CoinGeckoMarketService()
}

export const getMarketData: api.MarketDataType = async ({ chain, tokenId }: api.MarketDataArgs) => {
  return getDefaultMarketService().getMarketData({ chain, tokenId })
}

export const getPriceHistory: api.PriceHistoryType = ({
  chain,
  timeframe,
  tokenId
}: api.PriceHistoryArgs): Promise<api.HistoryData[] | null> => {
  return getDefaultMarketService().getPriceHistory({ chain, timeframe, tokenId })
}
