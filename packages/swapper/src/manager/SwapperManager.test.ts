/* eslint-disable @typescript-eslint/ban-ts-comment */
import { ChainAdapterManager } from '@shapeshiftoss/chain-adapters'
import { SwapperType } from '@shapeshiftoss/types'
import Web3 from 'web3'

import { ThorchainSwapper, ZrxSwapper } from '../swappers'
import { SwapperManager } from './SwapperManager'

describe('SwapperManager', () => {
  const zrxSwapperDeps = {
    web3: <Web3>{},
    adapterManager: <ChainAdapterManager>{}
  }

  describe('constructor', () => {
    it('should return an instance', () => {
      const manager = new SwapperManager()
      expect(manager).toBeInstanceOf(SwapperManager)
    })
  })

  describe('addSwapper', () => {
    it('should add swapper', () => {
      const manager = new SwapperManager()
      manager.addSwapper(SwapperType.Thorchain, new ThorchainSwapper())
      expect(manager.getSwapper(SwapperType.Thorchain)).toBeInstanceOf(ThorchainSwapper)
    })

    it('should be chainable', async () => {
      const manager = new SwapperManager()
      manager
        .addSwapper(SwapperType.Thorchain, new ThorchainSwapper())
        .addSwapper(SwapperType.Zrx, new ZrxSwapper(zrxSwapperDeps))
      expect(manager.getSwapper(SwapperType.Zrx)).toBeInstanceOf(ZrxSwapper)
    })

    it('should throw an error if adding an existing chain', () => {
      const swapper = new SwapperManager()
      expect(() => {
        swapper
          .addSwapper(SwapperType.Thorchain, new ThorchainSwapper())
          .addSwapper(SwapperType.Thorchain, new ZrxSwapper(zrxSwapperDeps))
      }).toThrow('already exists')
    })
  })

  describe('getSwapper', () => {
    it('should return a swapper that has been added', () => {
      const swapper = new SwapperManager()
      swapper.addSwapper(SwapperType.Thorchain, new ThorchainSwapper())
      expect(swapper.getSwapper(SwapperType.Thorchain)).toBeInstanceOf(ThorchainSwapper)
    })

    it('should return the correct swapper', () => {
      const swapper = new SwapperManager()
      swapper
        .addSwapper(SwapperType.Thorchain, new ThorchainSwapper())
        .addSwapper(SwapperType.Zrx, new ZrxSwapper(zrxSwapperDeps))

      expect(swapper.getSwapper(SwapperType.Thorchain)).toBeInstanceOf(ThorchainSwapper)
      expect(swapper.getSwapper(SwapperType.Zrx)).toBeInstanceOf(ZrxSwapper)
    })

    it('should throw an error if swapper is not set', () => {
      const swapper = new SwapperManager()
      expect(() => swapper.getSwapper(SwapperType.Thorchain)).toThrow(
        '[getSwapper] - swapperType doesnt exist'
      )
    })

    it('should throw an error if an invalid Swapper instance is passed', () => {
      const manager = new SwapperManager()
      // @ts-ignore
      expect(() => manager.addSwapper(SwapperType.Thorchain, {})).toThrow(
        '[validateSwapper] - invalid swapper instance'
      )
    })
  })

  describe('removeSwapper', () => {
    it('should remove swapper and return this', () => {
      const swapper = new SwapperManager()
      swapper
        .addSwapper(SwapperType.Thorchain, new ThorchainSwapper())
        .removeSwapper(SwapperType.Thorchain)
      expect(() => swapper.getSwapper(SwapperType.Thorchain)).toThrow(
        `[getSwapper] - swapperType doesnt exist`
      )
    })

    it("should throw an error if swapper isn't set", () => {
      const swapper = new SwapperManager()
      expect(() => swapper.removeSwapper(SwapperType.Thorchain)).toThrow(
        `[removeSwapper] - swapperType doesnt exist`
      )
    })
  })

  describe('getSwapperByPair', () => {
    it('should return swapper(s) that support all assets given', () => {
      const sellAssetId = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d' // FOX
      const buyAssetId = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' // USDC
      const zrxSwapper = new ZrxSwapper(zrxSwapperDeps)
      const swapperManager = new SwapperManager()

      swapperManager
        .addSwapper(SwapperType.Zrx, zrxSwapper)
        .addSwapper(SwapperType.Thorchain, new ThorchainSwapper())

      expect(swapperManager.getSwappersByPair({ sellAssetId, buyAssetId })).toEqual([zrxSwapper])
    })

    it('should return an empty array if no swapper is found', () => {
      const sellAssetId = 'randomAssetId'
      const buyAssetId = 'randomAssetId2'
      const zrxSwapper = new ZrxSwapper(zrxSwapperDeps)
      const swapperManager = new SwapperManager()

      swapperManager
        .addSwapper(SwapperType.Zrx, zrxSwapper)
        .addSwapper(SwapperType.Thorchain, new ThorchainSwapper())

      expect(swapperManager.getSwappersByPair({ sellAssetId, buyAssetId })).toEqual([])
    })
  })

  describe('getSupportedBuyAssetIdsFromSellId', () => {
    it('should return an array of supported buy assetIds given a sell asset Id', () => {
      const assetIds = [
        'bip122:000000000019d6689c085ae165831e93/slip44:0',
        'eip155:1/erc20:0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9', // Aave
        'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d' // Fox
      ]

      const sellAssetId = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
      const swapper = new SwapperManager()
      swapper.addSwapper(SwapperType.Zrx, new ZrxSwapper(zrxSwapperDeps))

      expect(swapper.getSupportedBuyAssetIdsFromSellId({ sellAssetId, assetIds })).toStrictEqual(
        assetIds.slice(-2)
      )
    })

    it('should return unique assetIds', () => {
      const assetIds = [
        'bip122:000000000019d6689c085ae165831e93/slip44:0',
        'eip155:1/erc20:0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9', // Aave
        'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d', // Fox
        'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d' // Fox (duplicate)
      ]

      const sellAssetId = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
      const swapper = new SwapperManager()
      swapper.addSwapper(SwapperType.Zrx, new ZrxSwapper(zrxSwapperDeps))

      expect(swapper.getSupportedBuyAssetIdsFromSellId({ sellAssetId, assetIds })).toStrictEqual(
        assetIds.slice(1, 3)
      )
    })
  })

  describe('getSupportedSellableAssets', () => {
    it('should return an array of supported sell assetIds', () => {
      const assetIds = [
        'bip122:000000000019d6689c085ae165831e93/slip44:0',
        'eip155:1/erc20:0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9', // Aave
        'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d' // Fox
      ]

      const swapper = new SwapperManager()
      swapper.addSwapper(SwapperType.Zrx, new ZrxSwapper(zrxSwapperDeps))

      expect(swapper.getSupportedSellableAssetIds({ assetIds })).toStrictEqual(assetIds.slice(-2))
    })

    it('should return unique assetIds', () => {
      const assetIds = [
        'bip122:000000000019d6689c085ae165831e93/slip44:0',
        'eip155:1/erc20:0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9', // Aave
        'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d', // Fox
        'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d' // Fox (duplicate)
      ]

      const swapper = new SwapperManager()
      swapper.addSwapper(SwapperType.Zrx, new ZrxSwapper(zrxSwapperDeps))

      expect(swapper.getSupportedSellableAssetIds({ assetIds })).toStrictEqual(assetIds.slice(1, 3))
    })
  })
})
