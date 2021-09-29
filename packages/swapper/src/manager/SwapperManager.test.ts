/* eslint-disable @typescript-eslint/ban-ts-comment */
import Web3 from 'web3'
import { SwapperType } from '../api'
import { ThorchainSwapper, ZrxSwapper } from '../swappers'
import { SwapperManager } from './SwapperManager'
import { ChainAdapterManager } from '@shapeshiftoss/chain-adapters'

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
        "SwapperError:getSwapper - Thorchain doesn't exist"
      )
    })

    it('should throw an error if an invalid Swapper instance is passed', () => {
      const manager = new SwapperManager()
      // @ts-ignore
      expect(() => manager.addSwapper(SwapperType.Thorchain, {})).toThrow(
        'SwapperError:validateSwapper - invalid swapper instance'
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
        `SwapperError:getSwapper - ${SwapperType.Thorchain} doesn't exist`
      )
    })

    it("should throw an error if swapper isn't set", () => {
      const swapper = new SwapperManager()
      expect(() => swapper.removeSwapper(SwapperType.Thorchain)).toThrow(
        `SwapperError:removeSwapper - ${SwapperType.Thorchain} doesn't exist`
      )
    })
  })
})
