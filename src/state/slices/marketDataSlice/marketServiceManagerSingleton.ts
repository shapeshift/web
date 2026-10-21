// do not directly use or export, singleton
import { MarketServiceManager } from '@/lib/market-service'

let _marketServiceManager: MarketServiceManager | undefined

type GetMarketServiceManager = () => MarketServiceManager

export const getMarketServiceManager: GetMarketServiceManager = () => {
  if (!_marketServiceManager) {
    _marketServiceManager = new MarketServiceManager()
  }
  return _marketServiceManager
}
