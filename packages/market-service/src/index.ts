import { CoinGeckoMarketService } from './coingecko/coingecko'
import * as api from './api'

export * from './api'

export const getDefaultMarketService = (): api.MarketService => {
  return new CoinGeckoMarketService()
}

export const getMarketData: api.MarketDataType = async (chain, tokenId) => {
  return getDefaultMarketService().getMarketData(chain, tokenId)
}

export const getPriceHistory: api.PriceHistoryType = (
  chain,
  timeline,
  tokenId
): Promise<api.HistoryData[]> => {
  return getDefaultMarketService().getPriceHistory(chain, timeline, tokenId)
}
