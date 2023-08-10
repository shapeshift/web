import type { AssetId } from '@shapeshiftoss/caip'
import { mockMarketData } from 'test/mocks/marketData'
import { mockStore } from 'test/mocks/store'
import { SwapperName } from 'lib/swapper/api'
import { getInputOutputRatioFromQuote } from 'state/apis/swappers/helpers/getInputOutputRatioFromQuote'
import { lifiQuote } from 'state/apis/swappers/helpers/testData'
import type { ReduxState } from 'state/reducer'

const usdcAssetId: AssetId = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'

jest.mock('state/slices/assetsSlice/selectors', () => {
  const { ETH } = require('lib/swapper/swappers/utils/test-data/assets')

  return {
    ...jest.requireActual('state/slices/assetsSlice/selectors'),
    selectFeeAssetById: jest.fn(() => ETH),
  }
})

jest.mock('state/slices/marketDataSlice/selectors', () => {
  const { ethAssetId, foxAssetId } = require('@shapeshiftoss/caip')
  const { assertUnreachable } = require('lib/utils')

  return {
    ...jest.requireActual('state/slices/marketDataSlice/selectors'),
    selectCryptoMarketData: jest.fn(() => ({
      [ethAssetId]: mockMarketData({ price: '2831' }),
      [foxAssetId]: mockMarketData({ price: '0.01927' }),
      [usdcAssetId]: mockMarketData({ price: '1' }),
    })),
    selectUsdRateByAssetId: jest.fn((_state: ReduxState, assetId: AssetId) => {
      switch (assetId) {
        case ethAssetId:
          return '2831'
        case foxAssetId:
          return '0.01927'
        case usdcAssetId:
          return '1'
        default:
          assertUnreachable(assetId)
      }
    }),
  }
})

describe('getInputOutputRatioFromQuote', () => {
  test('should return correct ratio for a Lifi quote', () => {
    const mockState = {
      ...mockStore,
    }
    const ratio = getInputOutputRatioFromQuote({
      state: mockState,
      quote: lifiQuote,
      swapperName: SwapperName.LIFI,
    })

    expect(ratio).toBe(0.47610743584117404)
  })
})
