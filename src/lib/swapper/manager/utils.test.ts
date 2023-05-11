import type { ChainId } from '@shapeshiftoss/caip'
import type { Asset } from 'lib/asset-service'

import type { TradeQuote } from '../api'
import { ETH } from '../swappers/utils/test-data/assets'
import { tradeQuote } from './testData'
import { getRatioFromQuote } from './utils'

describe('getRatioFromQuote', () => {
  it('should get the ratio for a quote', async () => {
    const quote: TradeQuote<ChainId> = tradeQuote
    const feeAsset: Asset = ETH
    const result = await getRatioFromQuote({
      quote,
      feeAsset,
      buyAssetFiatRate: '1300',
      sellAssetFiatRate: '0.04',
      feeAssetFiatRate: '1300',
    })
    expect(result).toBe(0.5162013781611758)
  })
})
