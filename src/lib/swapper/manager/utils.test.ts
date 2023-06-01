import type { ChainId } from '@shapeshiftoss/caip'
import type { ReduxState } from 'state/reducer'

import type { TradeQuote } from '../api'
import { ETH as mockEthereum } from '../swappers/utils/test-data/assets'
import { cryptoMarketDataById } from '../swappers/utils/test-data/cryptoMarketDataById'
import { tradeQuote } from './testData'
import { getRatioFromQuote } from './utils'

jest.mock('state/slices/selectors', () => ({
  selectFeeAssetByChainId: (_state: ReduxState, _chainId: ChainId) => mockEthereum,
}))

describe('getRatioFromQuote', () => {
  it('should get the ratio for a quote', () => {
    const quote: TradeQuote<ChainId> = tradeQuote
    const result = getRatioFromQuote({
      quote,
      cryptoMarketDataById,
    })
    expect(result).toBe(0.5876006170074233)
  })
})
