import { FindAllMarketType, FindByCaip19MarketType, PriceHistoryType } from '@shapeshiftoss/types'

export interface MarketService {
  baseUrl: string
  findAll: FindAllMarketType
  findPriceHistoryByCaip19: PriceHistoryType
  findByCaip19: FindByCaip19MarketType
}
