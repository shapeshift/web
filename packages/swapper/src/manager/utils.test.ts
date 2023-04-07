import { Asset } from '@shapeshiftoss/asset-service'
import { ChainId } from '@shapeshiftoss/caip'

import { Swapper, TradeQuote } from '../api'
import { ETH } from '../swappers/utils/test-data/assets'
import { tradeQuote } from './testData'
import { getRatioFromQuote } from './utils'

describe('getRatioFromQuote', () => {
  it('should get the ratio for a quote', async () => {
    const quote: TradeQuote<ChainId> = tradeQuote
    const swapper: Swapper<ChainId> = {
      getUsdRate: jest
        .fn()
        .mockResolvedValueOnce(0.04)
        .mockResolvedValueOnce(1300)
        .mockResolvedValueOnce(1300),
    } as unknown as Swapper<ChainId>
    const feeAsset: Asset = ETH
    const result = await getRatioFromQuote(quote, swapper, feeAsset)
    expect(result).toBe(0.5162031488156889)
  })
})
