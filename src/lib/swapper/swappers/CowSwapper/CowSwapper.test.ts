import { getSwapperBySwapperName } from 'components/MultiHopTrade/helpers'
import {
  BTC,
  ETH,
  FOX_GNOSIS,
  FOX_MAINNET,
  WBTC,
  WETH,
  XDAI,
} from 'lib/swapper/swappers/utils/test-data/assets'

import { SwapperName } from '../../api'

jest.mock('./utils/helpers/helpers', () => {
  const { KnownChainIds } = require('@shapeshiftoss/types')
  return {
    getSupportedChainIds: () => [KnownChainIds.EthereumMainnet, KnownChainIds.GnosisMainnet],
  }
})

jest.mock('./getCowSwapTradeQuote/getCowSwapTradeQuote', () => ({
  getCowSwapTradeQuote: jest.fn(),
}))

jest.mock('./cowBuildTrade/cowBuildTrade', () => ({
  cowBuildTrade: jest.fn(),
}))

jest.mock('./cowExecuteTrade/cowExecuteTrade', () => ({
  cowExecuteTrade: jest.fn(),
}))

jest.mock('./cowGetTradeTxs/cowGetTradeTxs', () => ({
  cowGetTradeTxs: jest.fn(),
}))

jest.mock('state/zustand/swapperStore/amountSelectors', () => ({
  ...jest.requireActual('state/zustand/swapperStore/amountSelectors'),
  selectSellAssetUsdRate: jest.fn(() => '1'),
  selectBuyAssetUsdRate: jest.fn(() => '2'),
}))

jest.mock('state/slices/assetsSlice/selectors', () => {
  const {
    BTC,
    ETH,
    FOX_GNOSIS,
    FOX_MAINNET,
    WBTC,
    WETH,
    XDAI,
  } = require('lib/swapper/swappers/utils/test-data/assets')

  return {
    ...jest.requireActual('state/slices/assetsSlice/selectors'),
    selectAssets: jest.fn(() => ({
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

const ASSET_IDS = [
  ETH.assetId,
  WBTC.assetId,
  WETH.assetId,
  BTC.assetId,
  FOX_MAINNET.assetId,
  XDAI.assetId,
]

describe('CowSwapper', () => {
  const swapper = getSwapperBySwapperName(SwapperName.CowSwap)

  describe('filterAssetIdsBySellable', () => {
    it('returns empty array when called with an empty array', async () => {
      expect(await swapper.filterAssetIdsBySellable([])).toEqual([])
    })

    it('returns array filtered out of non erc20 tokens', async () => {
      expect(await swapper.filterAssetIdsBySellable(ASSET_IDS)).toEqual([
        WBTC.assetId,
        WETH.assetId,
        FOX_MAINNET.assetId,
      ])
    })

    it('returns array filtered out of unsupported tokens', async () => {
      const assetIds = [
        FOX_MAINNET.assetId,
        FOX_GNOSIS.assetId,
        'eip155:1/erc20:0xdc49108ce5c57bc3408c3a5e95f3d864ec386ed3',
      ]

      expect(await swapper.filterAssetIdsBySellable(assetIds)).toEqual([
        FOX_MAINNET.assetId,
        FOX_GNOSIS.assetId,
      ])
    })
  })

  describe('filterBuyAssetsBySellAssetId', () => {
    it('returns empty array when called with an empty assetIds array', async () => {
      expect(
        await swapper.filterBuyAssetsBySellAssetId({
          nonNftAssetIds: [],
          sellAssetId: WETH.assetId,
        }),
      ).toEqual([])
    })

    it('returns empty array when called with sellAssetId that is not sellable', async () => {
      expect(
        await swapper.filterBuyAssetsBySellAssetId({
          nonNftAssetIds: ASSET_IDS,
          sellAssetId: ETH.assetId,
        }),
      ).toEqual([])
      expect(
        await swapper.filterBuyAssetsBySellAssetId({
          nonNftAssetIds: ASSET_IDS,
          sellAssetId: 'eip155:1/erc20:0xdc49108ce5c57bc3408c3a5e95f3d864ec386ed3',
        }),
      ).toEqual([])
    })

    it('returns array filtered out of non erc20 tokens when called with a sellable sellAssetId', async () => {
      expect(
        await swapper.filterBuyAssetsBySellAssetId({
          nonNftAssetIds: ASSET_IDS,
          sellAssetId: WETH.assetId,
        }),
      ).toEqual([ETH.assetId, WBTC.assetId, FOX_MAINNET.assetId])
      expect(
        await swapper.filterBuyAssetsBySellAssetId({
          nonNftAssetIds: ASSET_IDS,
          sellAssetId: WBTC.assetId,
        }),
      ).toEqual([ETH.assetId, WETH.assetId, FOX_MAINNET.assetId])
      expect(
        await swapper.filterBuyAssetsBySellAssetId({
          nonNftAssetIds: ASSET_IDS,
          sellAssetId: FOX_MAINNET.assetId,
        }),
      ).toEqual([ETH.assetId, WBTC.assetId, WETH.assetId])
    })

    it('returns array filtered out of unsupported tokens when called with a sellable sellAssetId', async () => {
      const nonNftAssetIds = [
        FOX_MAINNET.assetId,
        'eip155:1/erc20:0xdc49108ce5c57bc3408c3a5e95f3d864ec386ed3',
      ]
      expect(
        await swapper.filterBuyAssetsBySellAssetId({
          nonNftAssetIds,
          sellAssetId: WETH.assetId,
        }),
      ).toEqual([FOX_MAINNET.assetId])
      expect(
        await swapper.filterBuyAssetsBySellAssetId({
          nonNftAssetIds,
          sellAssetId: FOX_MAINNET.assetId,
        }),
      ).toEqual([])
    })
  })
})
