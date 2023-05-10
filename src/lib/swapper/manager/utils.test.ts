import type { ChainId } from '@shapeshiftoss/caip'
import { Ok } from '@sniptt/monads'
import type { Asset } from 'lib/asset-service'

import type { Swapper, TradeQuote } from '../api'
import { ETH } from '../swappers/utils/test-data/assets'
import { tradeQuote } from './testData'
import { getRatioFromQuote } from './utils'

const mockOk = Ok as jest.MockedFunction<typeof Ok>
describe('getRatioFromQuote', () => {
  it('should get the ratio for a quote', async () => {
    const quote: TradeQuote<ChainId> = tradeQuote
    const swapper: Swapper<ChainId> = {
      getUsdRate: jest
        .fn()
        .mockResolvedValueOnce(mockOk(0.04))
        .mockResolvedValueOnce(mockOk(1300))
        .mockResolvedValueOnce(mockOk(1300)),
    } as unknown as Swapper<ChainId>
    const feeAsset: Asset = ETH
    const result = await getRatioFromQuote(quote, swapper, feeAsset)
    expect(result).toBe(0.5162013781611758)
  })
})
