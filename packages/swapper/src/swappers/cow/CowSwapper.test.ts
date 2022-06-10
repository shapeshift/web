import { SwapperType } from '../../api'
import { BTC, ETH, FOX, WBTC, WETH } from '../utils/test-data/assets'
import { CowSwapper, CowSwapperDeps } from './CowSwapper'
import { getUsdRate } from './utils/helpers/helpers'

jest.mock('./utils/helpers/helpers')

const COW_SWAPPER_DEPS: CowSwapperDeps = {
  apiUrl: 'https://api.cow.fi/mainnet/api/'
}

const ASSET_IDS = [ETH.assetId, WBTC.assetId, WETH.assetId, BTC.assetId, FOX.assetId]

describe('CowSwapper', () => {
  const swapper = new CowSwapper(COW_SWAPPER_DEPS)

  describe('static properties', () => {
    it('returns the correct swapper name', async () => {
      expect(CowSwapper.swapperName).toEqual('CowSwapper')
    })
  })

  describe('getType', () => {
    it('returns the correct type for CowSwapper', async () => {
      await expect(swapper.getType()).toEqual(SwapperType.CowSwap)
    })
  })

  describe('getUsdRate', () => {
    it('calls getUsdRate on swapper.getUsdRate', async () => {
      await swapper.getUsdRate(FOX)
      expect(getUsdRate).toHaveBeenCalledWith(COW_SWAPPER_DEPS, FOX)
    })
  })

  describe('filterAssetIdsBySellable', () => {
    it('returns empty array when called with an empty array', async () => {
      expect(await swapper.filterAssetIdsBySellable([])).toEqual([])
    })

    it('returns array filtered out of non erc20 tokens', async () => {
      expect(await swapper.filterAssetIdsBySellable(ASSET_IDS)).toEqual([
        WBTC.assetId,
        WETH.assetId,
        FOX.assetId
      ])
    })

    it('returns array filtered out of unsupported tokens', async () => {
      const assetIds = [FOX.assetId, 'eip155:1/erc20:0xdc49108ce5c57bc3408c3a5e95f3d864ec386ed3']
      expect(await swapper.filterAssetIdsBySellable(assetIds)).toEqual([FOX.assetId])
    })
  })

  describe('filterBuyAssetsBySellAssetId', () => {
    it('returns empty array when called with an empty assetIds array', async () => {
      expect(
        await swapper.filterBuyAssetsBySellAssetId({ assetIds: [], sellAssetId: WETH.assetId })
      ).toEqual([])
    })

    it('returns empty array when called with sellAssetId that is not sellable', async () => {
      expect(
        await swapper.filterBuyAssetsBySellAssetId({
          assetIds: ASSET_IDS,
          sellAssetId: ETH.assetId
        })
      ).toEqual([])
      expect(
        await swapper.filterBuyAssetsBySellAssetId({
          assetIds: ASSET_IDS,
          sellAssetId: 'eip155:1/erc20:0xdc49108ce5c57bc3408c3a5e95f3d864ec386ed3'
        })
      ).toEqual([])
    })

    it('returns array filtered out of non erc20 tokens when called with a sellable sellAssetId', async () => {
      expect(
        await swapper.filterBuyAssetsBySellAssetId({
          assetIds: ASSET_IDS,
          sellAssetId: WETH.assetId
        })
      ).toEqual([WBTC.assetId, FOX.assetId])
      expect(
        await swapper.filterBuyAssetsBySellAssetId({
          assetIds: ASSET_IDS,
          sellAssetId: WBTC.assetId
        })
      ).toEqual([WETH.assetId, FOX.assetId])
      expect(
        await swapper.filterBuyAssetsBySellAssetId({
          assetIds: ASSET_IDS,
          sellAssetId: FOX.assetId
        })
      ).toEqual([WBTC.assetId, WETH.assetId])
    })

    it('returns array filtered out of unsupported tokens when called with a sellable sellAssetId', async () => {
      const assetIds = [FOX.assetId, 'eip155:1/erc20:0xdc49108ce5c57bc3408c3a5e95f3d864ec386ed3']
      expect(
        await swapper.filterBuyAssetsBySellAssetId({
          assetIds,
          sellAssetId: WETH.assetId
        })
      ).toEqual([FOX.assetId])
      expect(
        await swapper.filterBuyAssetsBySellAssetId({ assetIds, sellAssetId: FOX.assetId })
      ).toEqual([])
    })
  })
})
