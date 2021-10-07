/* eslint-disable @typescript-eslint/ban-ts-comment */
import { ChainTypes } from '@shapeshiftoss/types'
import { ChainAdapterManager } from './ChainAdapterManager'
import { EthereumChainAdapter } from './ethereum'

const getCAM = (opts?: Record<string, string>) => {
  return new ChainAdapterManager({ ethereum: 'http://localhost', ...opts })
}

describe('ChainAdapterManager', () => {
  describe('constructor', () => {
    it('should return an instance', () => {
      expect(getCAM()).toBeInstanceOf(ChainAdapterManager)
    })

    it('should throw an error if no unchained URLs', () => {
      // @ts-ignore
      expect(() => new ChainAdapterManager()).toThrow('Blockchain urls required')
    })

    it('should throw an error if no adapter is found', () => {
      // @ts-ignore
      expect(() => getCAM({ ripple: 'x' })).toThrow(
        'ChainAdapterManager: cannot instantiate ripple chain adapter'
      )
    })
  })

  describe('addChain', () => {
    it('should throw an error if chain is not a string', () => {
      const cam = getCAM()
      // @ts-ignore
      expect(() => cam.addChain(123, () => {})).toThrow('Parameter validation error') // eslint-disable-line @typescript-eslint/no-empty-function
    })

    it('should throw an error if factory is not a function', () => {
      const cam = getCAM()
      // @ts-ignore
      expect(() => cam.addChain('ripple', undefined)).toThrow('validation')
    })

    it('should add a network', () => {
      expect(
        // @ts-ignore
        getCAM().addChain(ChainTypes.Ethereum, () => new EthereumChainAdapter())
      ).toBeUndefined()
    })
  })

  describe('byChain', () => {
    it('should throw an error if no adapter is available', () => {
      const cam = getCAM()
      // @ts-ignore
      expect(() => cam.byChain('ripple')).toThrow(`Network [ripple] is not supported`) // eslint-disable-line @typescript-eslint/no-empty-function
    })

    it('should get an adapter factory', () => {
      const cam = getCAM()
      const adapter = cam.byChain(ChainTypes.Ethereum)
      const adapter2 = cam.byChain(ChainTypes.Ethereum)
      // @ts-ignore
      expect(adapter).toBeInstanceOf(EthereumChainAdapter)
      expect(adapter2).toBe(adapter)
    })
  })

  describe('getSupportedChains', () => {
    it('should return array of keys', () => {
      expect(getCAM().getSupportedChains()).toStrictEqual([ChainTypes.Ethereum])
    })
  })

  describe('getSupportedAdapters', () => {
    it('should return array of adapter classes', () => {
      // @ts-ignore
      expect(getCAM().getSupportedAdapters()).toStrictEqual([expect.any(Function)])
    })
  })
})
