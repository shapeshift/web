import { Ok } from '@sniptt/monads'
import {
  BSC,
  BTC,
  ETH as mockEthereum,
  FOX_GNOSIS,
  FOX_MAINNET,
  WETH,
} from 'lib/swapper/swappers/utils/test-data/assets'

import type { SwapperWithQuoteMetadata } from '../api'
import { SwapperName } from '../api'
import { ThorchainSwapper } from '../swappers/ThorchainSwapper/ThorchainSwapper'
import { cryptoMarketDataById } from '../swappers/utils/test-data/cryptoMarketDataById'
import { setupQuote } from '../swappers/utils/test-data/setupSwapQuote'
import { ZrxSwapper } from '../swappers/ZrxSwapper/ZrxSwapper'
import { SwapperManager } from './SwapperManager'
import {
  bestTradeQuote,
  getCowSwapper,
  getThorchainSwapper,
  getZrxSwapper,
  suboptimalTradeQuote,
} from './testData'

const zrxSwapper = getZrxSwapper()
const cowSwapper = getCowSwapper()
const thorchainSwapper = getThorchainSwapper()

jest.mock('state/slices/selectors', () => {
  const { assetsById } = require('lib/swapper/swappers/utils/test-data/assets') // Move the import inside the factory function

  return {
    selectAssets: () => assetsById,
    selectFeeAssetByChainId: () => mockEthereum,
  }
})

describe('SwapperManager', () => {
  describe('constructor', () => {
    it('should return an instance', () => {
      const manager = new SwapperManager()
      expect(manager).toBeInstanceOf(SwapperManager)
    })
  })

  describe('addSwapper', () => {
    it('should add swapper', () => {
      const swapperManager = new SwapperManager()
      swapperManager.addSwapper(thorchainSwapper)
      expect(swapperManager.swappers.get(SwapperName.Thorchain)).toBeInstanceOf(ThorchainSwapper)
    })

    it('should be chainable', () => {
      const swapperManager = new SwapperManager()
      swapperManager.addSwapper(thorchainSwapper).addSwapper(zrxSwapper)
      expect(swapperManager.swappers.get(SwapperName.Zrx)).toBeInstanceOf(ZrxSwapper)
    })

    it('should return the existing swapper if trying to add the same one', () => {
      const swapperManager = new SwapperManager()
      swapperManager.addSwapper(thorchainSwapper).addSwapper(thorchainSwapper)
      expect(swapperManager.swappers.get(SwapperName.Thorchain)).toBeInstanceOf(ThorchainSwapper)
    })
  })

  describe('getSupportedBuyAssetIdsFromSellId', () => {
    it('should return an array of supported buy assetIds given a sell asset Id', () => {
      const assetIds = [BTC.assetId, WETH.assetId, FOX_MAINNET.assetId]

      const sellAssetId = FOX_MAINNET.assetId
      const swapperManager = new SwapperManager()
      swapperManager.addSwapper(zrxSwapper)

      expect(
        swapperManager.getSupportedBuyAssetIdsFromSellId({ sellAssetId, assetIds }),
      ).toStrictEqual([WETH.assetId, FOX_MAINNET.assetId])
    })

    it('should return unique assetIds', () => {
      const assetIds = [BTC.assetId, WETH.assetId, WETH.assetId, FOX_MAINNET.assetId]

      const sellAssetId = FOX_MAINNET.assetId
      const swapperManager = new SwapperManager()
      swapperManager.addSwapper(zrxSwapper)

      expect(
        swapperManager.getSupportedBuyAssetIdsFromSellId({ sellAssetId, assetIds }),
      ).toStrictEqual([WETH.assetId, FOX_MAINNET.assetId])
    })
  })

  describe('getSupportedSellableAssets', () => {
    it('should return an array of supported sell assetIds', () => {
      const assetIds = [BSC.assetId, BTC.assetId]

      const swapperManager = new SwapperManager()
      swapperManager.addSwapper(zrxSwapper)

      expect(swapperManager.getSupportedSellableAssetIds({ assetIds })).toStrictEqual([BSC.assetId])
    })

    it('should return unique assetIds', () => {
      const assetIds = [BTC.assetId, WETH.assetId, FOX_MAINNET.assetId, FOX_GNOSIS.assetId]

      const swapperManager = new SwapperManager()
      swapperManager.addSwapper(zrxSwapper)

      expect(swapperManager.getSupportedSellableAssetIds({ assetIds })).toStrictEqual([
        WETH.assetId,
        FOX_MAINNET.assetId,
      ])
    })
  })

  describe('getSwappersWithQuoteMetadata', () => {
    it('should return the supported swappers with quote and ratio details, sorted by ratio', async () => {
      const cowSwapperGetUsdTradeQuoteMock = jest
        .spyOn(cowSwapper, 'getTradeQuote')
        .mockImplementation(jest.fn().mockResolvedValueOnce(Ok(suboptimalTradeQuote)))

      const zrxSwapperGetUsdTradeQuoteMock = jest
        .spyOn(zrxSwapper, 'getTradeQuote')
        .mockImplementation(jest.fn().mockResolvedValueOnce(Ok(bestTradeQuote)))

      const thorchainSwapperGetUsdTradeQuoteMock = jest.spyOn(thorchainSwapper, 'getTradeQuote')

      const swapperManagerMock = jest.spyOn(SwapperManager.prototype, 'getSwappersByPair')
      const swapperManager = new SwapperManager()

      swapperManager.addSwapper(cowSwapper).addSwapper(zrxSwapper)

      const { quoteInput } = setupQuote()
      const swappers = await swapperManager.getSwappersWithQuoteMetadata({
        ...quoteInput,
        cryptoMarketDataById,
      })
      const expectedSwappers: SwapperWithQuoteMetadata[] = [
        {
          swapper: zrxSwapper,
          quote: bestTradeQuote,
          inputOutputRatio: 0.5763658207357724,
        },
        {
          swapper: cowSwapper,
          quote: suboptimalTradeQuote,
          inputOutputRatio: 0.49513233227732306,
        },
      ]
      expect(swappers).toEqual(expectedSwappers)

      expect(swapperManagerMock).toHaveBeenCalledTimes(1)
      expect(cowSwapperGetUsdTradeQuoteMock).toHaveBeenCalledTimes(1)
      expect(zrxSwapperGetUsdTradeQuoteMock).toHaveBeenCalledTimes(1)
      expect(thorchainSwapperGetUsdTradeQuoteMock).toHaveBeenCalledTimes(0)

      swapperManagerMock.mockRestore()
    })
  })
})
