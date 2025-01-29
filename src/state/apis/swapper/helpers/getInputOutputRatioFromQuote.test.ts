import type { AssetId } from '@shapeshiftoss/caip'
import { ethAssetId, foxAssetId } from '@shapeshiftoss/caip'
import { SwapperName } from '@shapeshiftoss/swapper'
import { ethereum } from 'test/mocks/assets'
import { mockMarketData } from 'test/mocks/marketData'
import { mockStore } from 'test/mocks/store'
import { describe, expect, it, vi } from 'vitest'
import { assertUnreachable } from 'lib/utils'
import { getInputOutputRatioFromQuote } from 'state/apis/swapper/helpers/getInputOutputRatioFromQuote'
import { cowQuote, lifiQuote, thorQuote, zrxQuote } from 'state/apis/swapper/helpers/testData'
import type { ReduxState } from 'state/reducer'

const usdcAssetId: AssetId = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'

vi.mock('state/slices/assetsSlice/selectors', async importActual => {
  const actual: Record<any, any> = await importActual()
  return {
    ...actual,
    selectFeeAssetById: vi.fn((_state: ReduxState, assetId: AssetId) => {
      switch (assetId) {
        case ethAssetId:
        case usdcAssetId:
        case foxAssetId:
          return ethereum
        default:
          assertUnreachable(assetId as never)
      }
    }),
  }
})

vi.mock('state/slices/marketDataSlice/selectors', async importActual => {
  const actual: Record<any, any> = await importActual()
  return {
    ...actual,
    selectMarketDataUsd: vi.fn(() => ({
      [ethAssetId]: mockMarketData({ price: '1844' }),
      [foxAssetId]: mockMarketData({ price: '0.02' }),
      [usdcAssetId]: mockMarketData({ price: '1' }),
    })),
    selectUsdRateByAssetId: vi.fn((_state: ReduxState, assetId: AssetId) => {
      switch (assetId) {
        case ethAssetId:
          return '2831'
        case foxAssetId:
          return '0.01927'
        case usdcAssetId:
          return '1'
        default:
          assertUnreachable(assetId as never)
      }
    }),
  }
})

describe('getInputOutputRatioFromQuote', () => {
  it('should return correct ratio for a Lifi quote', () => {
    const mockState = {
      ...mockStore,
    }
    const ratio = getInputOutputRatioFromQuote({
      state: mockState,
      quote: lifiQuote,
      swapperName: SwapperName.LIFI,
    })

    expect(ratio).toBe(0.5835608776853983)
  })

  it('should return correct ratio for a CoW quote', () => {
    const mockState = {
      ...mockStore,
    }
    const ratio = getInputOutputRatioFromQuote({
      state: mockState,
      quote: cowQuote,
      swapperName: SwapperName.CowSwap,
    })

    expect(ratio).toBe(0.7796250166634718)
  })

  it('should return correct ratio for a THORSwap quote', () => {
    const mockState = {
      ...mockStore,
    }
    const ratio = getInputOutputRatioFromQuote({
      state: mockState,
      quote: thorQuote,
      swapperName: SwapperName.Thorchain,
    })

    expect(ratio).toBe(0.8330650727353319)
  })

  it('should return correct ratio for a 0x quote', () => {
    const mockState = {
      ...mockStore,
    }
    const ratio = getInputOutputRatioFromQuote({
      state: mockState,
      quote: zrxQuote,
      swapperName: SwapperName.Zrx,
    })

    expect(ratio).toBe(0.7514700580555285)
  })
})
