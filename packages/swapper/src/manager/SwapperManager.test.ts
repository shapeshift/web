import { ChainId } from '@shapeshiftoss/caip'

import { Swapper, SwapperType, SwapperWithQuoteMetadata } from '../api'
import { CowSwapper, ThorchainSwapper, ZrxSwapper } from '../swappers'
import { ETH } from '../swappers/utils/test-data/assets'
import { setupQuote } from '../swappers/utils/test-data/setupSwapQuote'
import { SwapperManager } from './SwapperManager'
import {
  badTradeQuote,
  getCowSwapper,
  getThorchainSwapper,
  getZrxAvalancheSwapper,
  getZrxBscwapper,
  getZrxEthereumSwapper,
  getZrxOptimismSwapper,
  goodTradeQuote,
} from './testData'

const zrxEthereumSwapper = getZrxEthereumSwapper()
const zrxAvalancheSwapper = getZrxAvalancheSwapper()
const zrxOptimismSwapper = getZrxOptimismSwapper()
const zrxBscSwapper = getZrxBscwapper()
const cowSwapper = getCowSwapper()
const thorchainSwapper = getThorchainSwapper()

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

    it('should be chainable', async () => {
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
      expect(swapperManager.getSwapper(SwapperType.CowSwap)).toBeInstanceOf(CowSwapper)
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
      const sellAssetId = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d' // FOX
      const buyAssetId = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' // USDC
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
      const assetIds = [
        'bip122:000000000019d6689c085ae165831e93/slip44:0',
        'eip155:1/erc20:0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9', // Aave
        'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d', // Fox
      ]

      const sellAssetId = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
      const swapperManager = new SwapperManager()
      swapperManager.addSwapper(zrxEthereumSwapper)

      expect(
        swapperManager.getSupportedBuyAssetIdsFromSellId({ sellAssetId, assetIds }),
      ).toStrictEqual(assetIds.slice(-2))
    })

    it('should return unique assetIds', () => {
      const assetIds = [
        'bip122:000000000019d6689c085ae165831e93/slip44:0',
        'eip155:1/erc20:0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9', // Aave
        'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d', // Fox
        'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d', // Fox (duplicate)
      ]

      const sellAssetId = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
      const swapperManager = new SwapperManager()
      swapperManager.addSwapper(zrxEthereumSwapper)

      expect(
        swapperManager.getSupportedBuyAssetIdsFromSellId({ sellAssetId, assetIds }),
      ).toStrictEqual(assetIds.slice(1, 3))
    })
  })

  describe('getSupportedSellableAssets', () => {
    it('should return an array of supported sell assetIds', () => {
      const assetIds = [
        'bip122:000000000019d6689c085ae165831e93/slip44:0',
        'eip155:1/erc20:0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9', // Aave
        'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d', // Fox
      ]

      const swapperManager = new SwapperManager()
      swapperManager.addSwapper(zrxEthereumSwapper)

      expect(swapperManager.getSupportedSellableAssetIds({ assetIds })).toStrictEqual(
        assetIds.slice(-2),
      )
    })

    it('should return unique assetIds', () => {
      const assetIds = [
        'bip122:000000000019d6689c085ae165831e93/slip44:0',
        'eip155:1/erc20:0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9', // Aave
        'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d', // Fox
        'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d', // Fox (duplicate)
      ]

      const swapperManager = new SwapperManager()
      swapperManager.addSwapper(zrxEthereumSwapper)

      expect(swapperManager.getSupportedSellableAssetIds({ assetIds })).toStrictEqual(
        assetIds.slice(1, 3),
      )
    })
  })

  describe('getSwappersWithQuoteMetadata', () => {
    it('should return the supported swappers with quote and ratio details, sorted by ratio', async () => {
      const cowSwapperGetUsdRateMock = jest
        .spyOn(cowSwapper, 'getUsdRate')
        .mockImplementation(
          jest
            .fn()
            .mockResolvedValueOnce(0.04)
            .mockResolvedValueOnce(1300)
            .mockResolvedValueOnce(1300),
        )

      const zrxEthereumSwapperGetUsdRateMock = jest
        .spyOn(zrxEthereumSwapper, 'getUsdRate')
        .mockImplementation(
          jest
            .fn()
            .mockResolvedValueOnce(0.04)
            .mockResolvedValueOnce(1300)
            .mockResolvedValueOnce(1300),
        )

      const zrxAvalancheSwapperGetUsdRateMock = jest.spyOn(zrxAvalancheSwapper, 'getUsdRate')
      const zrxOptimismSwapperGetUsdRateMock = jest.spyOn(zrxOptimismSwapper, 'getUsdRate')
      const zrxBscSwapperGetUsdRateMock = jest.spyOn(zrxBscSwapper, 'getUsdRate')

      const cowSwapperGetUsdTradeQuoteMock = jest
        .spyOn(cowSwapper, 'getTradeQuote')
        .mockImplementation(jest.fn().mockResolvedValueOnce(badTradeQuote))

      const zrxEthereumSwapperGetUsdTradeQuoteMock = jest
        .spyOn(zrxEthereumSwapper, 'getTradeQuote')
        .mockImplementation(jest.fn().mockResolvedValueOnce(goodTradeQuote))

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
      })
      const expectedSwappers: SwapperWithQuoteMetadata[] = [
        {
          swapper: zrxEthereumSwapper,
          quote: goodTradeQuote,
          inputOutputRatio: 0.5030325781663417,
        },
        {
          swapper: cowSwapper,
          quote: badTradeQuote,
          inputOutputRatio: 0.3433182480125743,
        },
      ]
      expect(swappers).toEqual(expectedSwappers)

      expect(swapperManagerMock).toHaveBeenCalledTimes(1)
      expect(cowSwapperGetUsdRateMock).toHaveBeenCalledTimes(3)
      expect(zrxEthereumSwapperGetUsdRateMock).toHaveBeenCalledTimes(3)
      expect(zrxAvalancheSwapperGetUsdRateMock).toHaveBeenCalledTimes(0)
      expect(zrxOptimismSwapperGetUsdRateMock).toHaveBeenCalledTimes(0)
      expect(zrxBscSwapperGetUsdRateMock).toHaveBeenCalledTimes(0)
      expect(cowSwapperGetUsdTradeQuoteMock).toHaveBeenCalledTimes(1)
      expect(zrxEthereumSwapperGetUsdTradeQuoteMock).toHaveBeenCalledTimes(1)
      expect(zrxAvalancheSwapperGetUsdTradeQuoteMock).toHaveBeenCalledTimes(0)
      expect(zrxOptimismSwapperGetUsdTradeQuoteMock).toHaveBeenCalledTimes(0)
      expect(zrxBscSwapperGetUsdTradeQuoteMock).toHaveBeenCalledTimes(0)

      cowSwapperGetUsdRateMock.mockRestore()
      zrxEthereumSwapperGetUsdRateMock.mockRestore()
      zrxAvalancheSwapperGetUsdRateMock.mockRestore()
      zrxOptimismSwapperGetUsdRateMock.mockRestore()
      zrxBscSwapperGetUsdRateMock.mockRestore()
      swapperManagerMock.mockRestore()
    })
  })
})
