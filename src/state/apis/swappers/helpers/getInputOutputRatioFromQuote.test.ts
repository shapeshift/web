import type { AssetId } from '@shapeshiftoss/caip'
import { mockMarketData } from 'test/mocks/marketData'
import { mockStore } from 'test/mocks/store'
import { SwapperName } from 'lib/swapper/api'
import { getInputOutputRatioFromQuote } from 'state/apis/swappers/helpers/getInputOutputRatioFromQuote'
import {
  cowQuote,
  lifiQuote,
  oneInchQuote,
  thorQuote,
  zrxQuote,
} from 'state/apis/swappers/helpers/testData'
import type { ReduxState } from 'state/reducer'

const usdcAssetId: AssetId = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'

jest.mock('state/slices/assetsSlice/selectors', () => {
  const { ETH } = require('lib/swapper/swappers/utils/test-data/assets')
  const { ethAssetId, foxAssetId } = require('@shapeshiftoss/caip')
  const { assertUnreachable } = require('lib/utils')

  return {
    ...jest.requireActual('state/slices/assetsSlice/selectors'),
    selectFeeAssetById: jest.fn((_state: ReduxState, assetId: AssetId) => {
      switch (assetId) {
        case ethAssetId:
        case usdcAssetId:
        case foxAssetId:
          return ETH
        default:
          assertUnreachable(assetId)
      }
    }),
  }
})

jest.mock('state/slices/marketDataSlice/selectors', () => {
  const { ethAssetId, foxAssetId } = require('@shapeshiftoss/caip')
  const { assertUnreachable } = require('lib/utils')

  return {
    ...jest.requireActual('state/slices/marketDataSlice/selectors'),
    selectCryptoMarketData: jest.fn(() => ({
      [ethAssetId]: mockMarketData({ price: '1844' }),
      [foxAssetId]: mockMarketData({ price: '0.02' }),
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

    expect(ratio).toBe(0.5806430732969714)
  })

  test('should return correct ratio for a CoW quote', () => {
    const mockState = {
      ...mockStore,
    }
    const ratio = getInputOutputRatioFromQuote({
      state: mockState,
      quote: cowQuote,
      swapperName: SwapperName.CowSwap,
    })

    expect(ratio).toBe(0.6753421967591836)
  })

  test('should return correct ratio for a THORSwap quote', () => {
    const mockState = {
      ...mockStore,
    }
    const ratio = getInputOutputRatioFromQuote({
      state: mockState,
      quote: thorQuote,
      swapperName: SwapperName.Thorchain,
    })

    expect(ratio).toBe(0.6454036704419476)
  })

  test('should return correct ratio for a 0x quote', () => {
    const mockState = {
      ...mockStore,
    }
    const ratio = getInputOutputRatioFromQuote({
      state: mockState,
      quote: zrxQuote,
      swapperName: SwapperName.Zrx,
    })

    expect(ratio).toBe(0.7499671179394174)
  })

  test('should return correct ratio for a 1inch quote', () => {
    const mockState = {
      ...mockStore,
    }
    const ratio = getInputOutputRatioFromQuote({
      state: mockState,
      quote: oneInchQuote,
      swapperName: SwapperName.OneInch,
    })

    expect(ratio).toBe(0.6491538483448477)
  })
})
