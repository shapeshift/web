import type { ChainId } from '@shapeshiftoss/caip'
import type { Asset } from 'lib/asset-service'

import type { TradeQuote } from '../api'
import { ETH } from '../swappers/utils/test-data/assets'
import { cryptoMarketDataById } from '../swappers/utils/test-data/cryptoMarketDataById'
import { tradeQuote } from './testData'
import { getRatioFromQuote } from './utils'

describe('getRatioFromQuote', () => {
  it('should get the ratio for a quote', () => {
    const quote: TradeQuote<ChainId> = tradeQuote
    const feeAsset: Asset = ETH
    const result = getRatioFromQuote({
      quote,
      feeAsset,
      cryptoMarketDataById,
    })
    expect(result).toBe(0.5876006170074233)
  })
})
