import { CHAIN_NAMESPACE, CHAIN_REFERENCE, toAssetId } from '@shapeshiftoss/caip'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { YearnTokenMarketCapService } from './yearn-tokens'
import { mockYearnTokenRestData } from './yearnMockData'

vi.mock('@yfi/sdk')

const mocks = vi.hoisted(() => ({
  vaultsTokens: vi.fn(() => {
    return Promise.resolve(mockYearnTokenRestData)
  }),
  tokensSupported: vi.fn(
    vi.fn(() => {
      return Promise.resolve(mockYearnTokenRestData)
    }),
  ),
}))

const mockedYearnSdk = vi.fn(() => ({
  vaults: {
    tokens: mocks.vaultsTokens,
  },
  tokens: {
    supported: mocks.tokensSupported,
  },
}))()

describe('yearn token market service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('findAll', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })
    it('can flatten multiple responses', async () => {
      const yearnTokenMarketCapService = new YearnTokenMarketCapService({
        // @ts-ignore
        yearnSdk: mockedYearnSdk,
      })
      const result = await yearnTokenMarketCapService.findAll()
      expect(Object.keys(result).length).toEqual(2)
    })

    it('can handle api errors', async () => {
      mockedYearnSdk.vaults.tokens.mockResolvedValueOnce({ error: 'foo' } as never)
      mockedYearnSdk.tokens.supported.mockResolvedValueOnce({ error: 'foo' } as never)
      const yearnTokenMarketCapService = new YearnTokenMarketCapService({
        // @ts-ignore
        yearnSdk: mockedYearnSdk,
      })
      const result = await yearnTokenMarketCapService.findAll()
      expect(Object.keys(result).length).toEqual(0)
    })

    it('can handle rate limiting', async () => {
      mockedYearnSdk.vaults.tokens.mockResolvedValueOnce({ status: 429 } as never)
      mockedYearnSdk.tokens.supported.mockResolvedValueOnce({ status: 429 } as never)
      const yearnTokenMarketCapService = new YearnTokenMarketCapService({
        // @ts-ignore
        yearnSdk: mockedYearnSdk,
      })
      const result = await yearnTokenMarketCapService.findAll()
      expect(Object.keys(result).length).toEqual(0)
    })

    it('can use default args', async () => {
      const yearnTokenMarketCapService = new YearnTokenMarketCapService({
        // @ts-ignore
        yearnSdk: mockedYearnSdk,
      })
      await yearnTokenMarketCapService.findAll()
      expect(mocks.vaultsTokens).toHaveBeenCalledTimes(1)
      expect(mocks.tokensSupported).toHaveBeenCalledTimes(1)
    })

    it('can use override args', async () => {
      const count = 1
      const yearnTokenMarketCapService = new YearnTokenMarketCapService({
        // @ts-ignore
        yearnSdk: mockedYearnSdk,
      })
      const result = await yearnTokenMarketCapService.findAll({ count })
      expect(mocks.vaultsTokens).toHaveBeenCalledTimes(1)
      expect(mocks.tokensSupported).toHaveBeenCalledTimes(1)
      expect(Object.keys(result).length).toEqual(1)
    })

    it('can map yearn to assetIds', async () => {
      const yearnTokenMarketCapService = new YearnTokenMarketCapService({
        // @ts-ignore
        yearnSdk: mockedYearnSdk,
      })
      const result = await yearnTokenMarketCapService.findAll()
      const yvBtcAssetId = toAssetId({
        chainNamespace: CHAIN_NAMESPACE.Evm,
        chainReference: CHAIN_REFERENCE.EthereumMainnet,
        assetNamespace: 'erc20',
        assetReference: mockYearnTokenRestData[0].address.toLowerCase(),
      })
      const yvDaiAssetId = toAssetId({
        chainNamespace: CHAIN_NAMESPACE.Evm,
        chainReference: CHAIN_REFERENCE.EthereumMainnet,
        assetNamespace: 'erc20',
        assetReference: mockYearnTokenRestData[1].address.toLowerCase(),
      })
      const [yvBtcKey, yvDaiKey] = Object.keys(result)
      expect(yvDaiKey).toEqual(yvDaiAssetId)
      expect(yvBtcKey).toEqual(yvBtcAssetId)
    })
  })

  describe('findByAssetId', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })
    const args = {
      assetId: 'eip155:1/erc20:0x19d3364a399d251e894ac732651be8b0e4e85001', // yvDai
    }
    it('should return market data for yvDai', async () => {
      const result = {
        price: '0.99',
        marketCap: '0',
        changePercent24Hr: 0,
        volume: '0',
      }
      const yearnTokenMarketCapService = new YearnTokenMarketCapService({
        // @ts-ignore
        yearnSdk: mockedYearnSdk,
      })
      expect(await yearnTokenMarketCapService.findByAssetId(args)).toEqual(result)
    })

    it('should return null on network error', async () => {
      mockedYearnSdk.vaults.tokens.mockRejectedValueOnce(Error as never)
      mockedYearnSdk.tokens.supported.mockRejectedValueOnce(Error as never)
      const yearnTokenMarketCapService = new YearnTokenMarketCapService({
        // @ts-ignore
        yearnSdk: mockedYearnSdk,
      })
      expect(await yearnTokenMarketCapService.findByAssetId(args)).toEqual(null)
    })
  })

  describe('findPriceHistoryByAssetId', () => {
    it('should return market empty array', async () => {
      const expected: [] = []
      const yearnTokenMarketCapService = new YearnTokenMarketCapService({
        // @ts-ignore
        yearnSdk: mockedYearnSdk,
      })
      expect(await yearnTokenMarketCapService.findPriceHistoryByAssetId()).toEqual(expected)
    })
  })
})
