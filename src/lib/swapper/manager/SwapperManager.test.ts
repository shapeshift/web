import type { ChainId } from '@shapeshiftoss/caip'
import { Ok } from '@sniptt/monads'
import { BSC, BTC, ETH, FOX, WBTC, WETH } from 'lib/swapper/swappers/utils/test-data/assets'

import type { Swapper, SwapperWithQuoteMetadata } from '../api'
import { SwapperType } from '../api'
import { CowSwapper } from '../swappers/CowSwapper/CowSwapper'
import { ThorchainSwapper } from '../swappers/ThorchainSwapper/ThorchainSwapper'
import { cryptoMarketDataById } from '../swappers/utils/test-data/cryptoMarketDataById'
import { setupQuote } from '../swappers/utils/test-data/setupSwapQuote'
import { ZrxSwapper } from '../swappers/ZrxSwapper/ZrxSwapper'
import { SwapperManager } from './SwapperManager'
import {
  bestTradeQuote,
  getCowSwapper,
  getThorchainSwapper,
  getZrxAvalancheSwapper,
  getZrxBscwapper,
  getZrxEthereumSwapper,
  getZrxOptimismSwapper,
  suboptimalTradeQuote,
} from './testData'

const zrxEthereumSwapper = getZrxEthereumSwapper()
const zrxAvalancheSwapper = getZrxAvalancheSwapper()
const zrxOptimismSwapper = getZrxOptimismSwapper()
const zrxBscSwapper = getZrxBscwapper()
const cowSwapper = getCowSwapper()
const thorchainSwapper = getThorchainSwapper()

jest.mock('state/slices/selectors', () => {
  const { assetsById } = require('lib/swapper/swappers/utils/test-data/assets') // Move the import inside the factory function

  return {
    selectAssets: () => assetsById,
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
      expect(swapperManager.getSwapper(SwapperType.Thorchain)).toBeInstanceOf(ThorchainSwapper)
    })

    it('should be chainable', () => {
      const swapperManager = new SwapperManager()
      swapperManager.addSwapper(thorchainSwapper).addSwapper(zrxEthereumSwapper)
      expect(swapperManager.getSwapper(SwapperType.ZrxEthereum)).toBeInstanceOf(ZrxSwapper)
    })

    it('should return the existing swapper if trying to add the same one', () => {
      const swapperManager = new SwapperManager()
      swapperManager.addSwapper(thorchainSwapper).addSwapper(thorchainSwapper)
      expect(swapperManager.getSwapper(SwapperType.Thorchain)).toBeInstanceOf(ThorchainSwapper)
    })
  })

  describe('getSwapper', () => {
    it('should return a swapper that has been added', () => {
      const swapperManager = new SwapperManager()
      swapperManager.addSwapper(thorchainSwapper)
      expect(swapperManager.getSwapper(SwapperType.Thorchain)).toBeInstanceOf(ThorchainSwapper)
    })

    it('should return the correct swapper', () => {
      const swapperManager = new SwapperManager()
      swapperManager
        .addSwapper(thorchainSwapper)
        .addSwapper(zrxEthereumSwapper)
        .addSwapper(zrxAvalancheSwapper)
        .addSwapper(zrxOptimismSwapper)
        .addSwapper(zrxBscSwapper)
        .addSwapper(cowSwapper)

      expect(swapperManager.getSwapper(SwapperType.Thorchain)).toBeInstanceOf(ThorchainSwapper)
      expect(swapperManager.getSwapper(SwapperType.ZrxEthereum)).toBeInstanceOf(ZrxSwapper)
      expect(swapperManager.getSwapper(SwapperType.ZrxAvalanche)).toBeInstanceOf(ZrxSwapper)
      expect(swapperManager.getSwapper(SwapperType.ZrxOptimism)).toBeInstanceOf(ZrxSwapper)
      expect(swapperManager.getSwapper(SwapperType.CowSwapEth)).toBeInstanceOf(CowSwapper)
    })

    it('should throw an error if swapper is not set', () => {
      const swapperManager = new SwapperManager()
      expect(() => swapperManager.getSwapper(SwapperType.Thorchain)).toThrow(
        '[getSwapper] - swapperType doesnt exist',
      )
    })

    it('should throw an error if an invalid Swapper instance is passed', () => {
      const swapperManager = new SwapperManager()
      const invalidSwapper = {} as Swapper<ChainId>
      expect(() => swapperManager.addSwapper(invalidSwapper)).toThrow(
        '[validateSwapper] - invalid swapper instance',
      )
    })
  })

  describe('removeSwapper', () => {
    it('should remove swapper and return this', () => {
      const swapperManager = new SwapperManager()
      swapperManager.addSwapper(thorchainSwapper).removeSwapper(SwapperType.Thorchain)
      expect(() => swapperManager.getSwapper(SwapperType.Thorchain)).toThrow(
        `[getSwapper] - swapperType doesnt exist`,
      )
    })

    it("should throw an error if swapper isn't set", () => {
      const swapperManager = new SwapperManager()
      expect(() => swapperManager.removeSwapper(SwapperType.Thorchain)).toThrow(
        `[removeSwapper] - swapperType doesnt exist`,
      )
    })
  })

  describe('getSwapperByPair', () => {
    it('should return swapper(s) that support all assets given', () => {
      const sellAssetId = FOX.assetId
      const buyAssetId = WBTC.assetId
      const swapperManager = new SwapperManager()

      swapperManager.addSwapper(zrxEthereumSwapper).addSwapper(thorchainSwapper)
      const swappersSupportingPair = swapperManager.getSwappersByPair({ sellAssetId, buyAssetId })
      expect(swappersSupportingPair).toEqual([zrxEthereumSwapper])
    })

    it('should return an empty array if no swapper is found', () => {
      const sellAssetId = 'eip155:43114/slip44:60'
      const buyAssetId = 'cosmos:cosmoshub-4/slip44:118'
      const swapperManager = new SwapperManager()

      swapperManager.addSwapper(zrxEthereumSwapper)

      expect(swapperManager.getSwappersByPair({ sellAssetId, buyAssetId })).toEqual([])
    })
  })

  describe('getSupportedBuyAssetIdsFromSellId', () => {
    it('should return an array of supported buy assetIds given a sell asset Id', () => {
      const assetIds = [BTC.assetId, WETH.assetId, FOX.assetId]

      const sellAssetId = FOX.assetId
      const swapperManager = new SwapperManager()
      swapperManager.addSwapper(zrxEthereumSwapper)

      expect(
        swapperManager.getSupportedBuyAssetIdsFromSellId({ sellAssetId, assetIds }),
      ).toStrictEqual([WETH.assetId, FOX.assetId])
    })

    it('should return unique assetIds', () => {
      const assetIds = [BTC.assetId, WETH.assetId, WETH.assetId, FOX.assetId]

      const sellAssetId = FOX.assetId
      const swapperManager = new SwapperManager()
      swapperManager.addSwapper(zrxEthereumSwapper)

      expect(
        swapperManager.getSupportedBuyAssetIdsFromSellId({ sellAssetId, assetIds }),
      ).toStrictEqual([WETH.assetId, FOX.assetId])
    })
  })

  describe('getSupportedSellableAssets', () => {
    it('should return an array of supported sell assetIds zrx eth mainnet', () => {
      const assetIds = [BTC.assetId, WETH.assetId, FOX.assetId]

      const swapperManager = new SwapperManager()
      swapperManager.addSwapper(zrxEthereumSwapper)

      expect(swapperManager.getSupportedSellableAssetIds({ assetIds })).toStrictEqual([
        WETH.assetId,
        FOX.assetId,
      ])
    })

    it('should return an array of supported sell assetIds zrx bsc', () => {
      const assetIds = [BSC.assetId, FOX.assetId]

      const swapperManager = new SwapperManager()
      swapperManager.addSwapper(zrxBscSwapper)

      expect(swapperManager.getSupportedSellableAssetIds({ assetIds })).toStrictEqual([BSC.assetId])
    })

    it('should return unique assetIds', () => {
      const assetIds = [BTC.assetId, WETH.assetId, FOX.assetId, FOX.assetId]

      const swapperManager = new SwapperManager()
      swapperManager.addSwapper(zrxEthereumSwapper)

      expect(swapperManager.getSupportedSellableAssetIds({ assetIds })).toStrictEqual([
        WETH.assetId,
        FOX.assetId,
      ])
    })
  })

  describe('getSwappersWithQuoteMetadata', () => {
    it('should return the supported swappers with quote and ratio details, sorted by ratio', async () => {
      const cowSwapperGetUsdTradeQuoteMock = jest
        .spyOn(cowSwapper, 'getTradeQuote')
        .mockImplementation(jest.fn().mockResolvedValueOnce(Ok(suboptimalTradeQuote)))

      const zrxEthereumSwapperGetUsdTradeQuoteMock = jest
        .spyOn(zrxEthereumSwapper, 'getTradeQuote')
        .mockImplementation(jest.fn().mockResolvedValueOnce(Ok(bestTradeQuote)))

      const zrxAvalancheSwapperGetUsdTradeQuoteMock = jest.spyOn(
        zrxAvalancheSwapper,
        'getTradeQuote',
      )

      const zrxOptimismSwapperGetUsdTradeQuoteMock = jest.spyOn(zrxOptimismSwapper, 'getTradeQuote')
      const zrxBscSwapperGetUsdTradeQuoteMock = jest.spyOn(zrxBscSwapper, 'getTradeQuote')

      const swapperManagerMock = jest.spyOn(SwapperManager.prototype, 'getSwappersByPair')
      const swapperManager = new SwapperManager()

      swapperManager
        .addSwapper(cowSwapper)
        .addSwapper(zrxEthereumSwapper)
        .addSwapper(zrxAvalancheSwapper)
        .addSwapper(zrxOptimismSwapper)
        .addSwapper(zrxBscSwapper)

      const { quoteInput } = setupQuote()
      const swappers = await swapperManager.getSwappersWithQuoteMetadata({
        ...quoteInput,
        feeAsset: ETH,
        cryptoMarketDataById,
      })
      const expectedSwappers: SwapperWithQuoteMetadata[] = [
        {
          swapper: zrxEthereumSwapper,
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
      expect(zrxEthereumSwapperGetUsdTradeQuoteMock).toHaveBeenCalledTimes(1)
      expect(zrxAvalancheSwapperGetUsdTradeQuoteMock).toHaveBeenCalledTimes(0)
      expect(zrxOptimismSwapperGetUsdTradeQuoteMock).toHaveBeenCalledTimes(0)
      expect(zrxBscSwapperGetUsdTradeQuoteMock).toHaveBeenCalledTimes(0)

      swapperManagerMock.mockRestore()
    })
  })
})
