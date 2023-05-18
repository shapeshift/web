import type { ChainId } from '@shapeshiftoss/caip'
import type { Asset } from 'lib/asset-service'

import type { TradeQuote } from '../api'
import { ETH, FOX } from '../swappers/utils/test-data/assets'
import { tradeQuote } from './testData'
import { getRatioFromQuote } from './utils'

describe('getRatioFromQuote', () => {
  it('should get the ratio for a quote', async () => {
    const quote: TradeQuote<ChainId> = tradeQuote
    const feeAsset: Asset = ETH
    const cryptoMarketDataById = {
      [FOX.assetId]: { price: '0.04' },
      [ETH.assetId]: { price: '1300' },
    }
    const assetsById = {
      [FOX.assetId]: FOX,
      [ETH.assetId]: ETH,
    }
    const result = await getRatioFromQuote({
      quote,
      feeAsset,
      cryptoMarketDataById,
      assetsById,
    })
    expect(result).toBe(0.5162013781611758)
  })
})
