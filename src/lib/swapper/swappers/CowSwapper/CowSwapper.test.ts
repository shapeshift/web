import { describe, expect, it, vi } from 'vitest'
import {
  BTC,
  ETH,
  FOX_GNOSIS,
  FOX_MAINNET,
  WBTC,
  WETH,
  XDAI,
} from 'lib/swapper/swappers/utils/test-data/assets'

import { cowSwapper } from './CowSwapper'

vi.mock('./getCowSwapTradeQuote/getCowSwapTradeQuote', () => ({
  getCowSwapTradeQuote: vi.fn(),
}))

vi.mock('state/slices/assetsSlice/selectors', async () => {
  const {
    BTC,
    ETH,
    FOX_GNOSIS,
    FOX_MAINNET,
    WBTC,
    WETH,
    XDAI,
  } = require('lib/swapper/swappers/utils/test-data/assets')

  const actual = await vi.importActual('state/slices/assetsSlice/selectors')
  return {
    ...actual,
    selectAssets: vi.fn(() => ({
      [BTC.assetId]: BTC,
      [ETH.assetId]: ETH,
      [FOX_GNOSIS.assetId]: FOX_GNOSIS,
      [FOX_MAINNET.assetId]: FOX_MAINNET,
      [WBTC.assetId]: WBTC,
      [WETH.assetId]: WETH,
      [XDAI.assetId]: XDAI,
    })),
  }
})

const ASSETS = [ETH, WBTC, WETH, BTC, FOX_MAINNET, XDAI]

describe('CowSwapper', () => {
  describe('filterAssetIdsBySellable', () => {
    it('returns empty array when called with an empty array', async () => {
      expect(await cowSwapper.filterAssetIdsBySellable([])).toEqual([])
    })

    it('returns array filtered out of non erc20 tokens', async () => {
      expect(await cowSwapper.filterAssetIdsBySellable(ASSETS)).toEqual([
        WBTC.assetId,
        WETH.assetId,
        FOX_MAINNET.assetId,
      ])
    })

    it('returns array filtered out of unsupported tokens', async () => {
      const assetIds = [FOX_MAINNET, FOX_GNOSIS, BTC]

      expect(await cowSwapper.filterAssetIdsBySellable(assetIds)).toEqual([
        FOX_MAINNET.assetId,
        FOX_GNOSIS.assetId,
      ])
    })
  })

  describe('filterBuyAssetsBySellAssetId', () => {
    it('returns empty array when called with an empty assetIds array', async () => {
      expect(
        await cowSwapper.filterBuyAssetsBySellAssetId({
          assets: [],
          sellAsset: WETH,
        }),
      ).toEqual([])
    })

    it('returns empty array when called with sellAssetId that is not sellable', async () => {
      expect(
        await cowSwapper.filterBuyAssetsBySellAssetId({
          assets: ASSETS,
          sellAsset: ETH,
        }),
      ).toEqual([])
      expect(
        await cowSwapper.filterBuyAssetsBySellAssetId({
          assets: ASSETS,
          sellAsset: BTC,
        }),
      ).toEqual([])
    })

    it('returns array filtered out of non erc20 tokens when called with a sellable sellAssetId', async () => {
      expect(
        await cowSwapper.filterBuyAssetsBySellAssetId({
          assets: ASSETS,
          sellAsset: WETH,
        }),
      ).toEqual([ETH.assetId, WBTC.assetId, FOX_MAINNET.assetId])
      expect(
        await cowSwapper.filterBuyAssetsBySellAssetId({
          assets: ASSETS,
          sellAsset: WBTC,
        }),
      ).toEqual([ETH.assetId, WETH.assetId, FOX_MAINNET.assetId])
      expect(
        await cowSwapper.filterBuyAssetsBySellAssetId({
          assets: ASSETS,
          sellAsset: FOX_MAINNET,
        }),
      ).toEqual([ETH.assetId, WBTC.assetId, WETH.assetId])
    })

    it('returns array filtered out of unsupported tokens when called with a sellable sellAssetId', async () => {
      const assets = [FOX_MAINNET, BTC]
      expect(
        await cowSwapper.filterBuyAssetsBySellAssetId({
          assets,
          sellAsset: WETH,
        }),
      ).toEqual([FOX_MAINNET.assetId])
      expect(
        await cowSwapper.filterBuyAssetsBySellAssetId({
          assets,
          sellAsset: FOX_MAINNET,
        }),
      ).toEqual([])
    })
  })
})
