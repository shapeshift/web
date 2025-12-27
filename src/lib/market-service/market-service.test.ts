import { btcAssetId, ethAssetId } from '@shapeshiftoss/caip'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import { ethers } from 'ethers'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { CoinGeckoMarketService } from './coingecko/coingecko'
import {
  mockCGFindAllData,
  mockCGFindByAssetIdData,
  mockCGPriceHistoryData,
} from './coingecko/coingeckoMockData'
import { mockFoxyMarketData, mockFoxyPriceHistoryData } from './foxy/foxyMockData'
import { MarketServiceManager } from './market-service-manager'
import { mockTcyMarketData, mockTcyPriceHistoryData } from './tcy/tcyMockData'

import { initAssetService } from '@/lib/asset-service'

const mockCoingeckoFindAll = vi.fn().mockImplementation(() => mockCGFindAllData)
const mockCoingeckoFindByAssetId = vi.fn().mockImplementation(() => mockCGFindByAssetIdData)
const mockCoingeckoFindPriceHistoryByAssetId = vi
  .fn()
  .mockImplementation(() => mockCGPriceHistoryData)

vi.mock('./coingecko/coingecko', () => ({
  CoinGeckoMarketService: vi.fn().mockImplementation(() => ({
    findAll: mockCoingeckoFindAll,
    findByAssetId: mockCoingeckoFindByAssetId,
    findPriceHistoryByAssetId: mockCoingeckoFindPriceHistoryByAssetId,
  })),
}))

const coingeckoMock = vi.mocked(CoinGeckoMarketService)

const mockCoincapFindAll = vi.fn().mockImplementation(() => mockCGFindAllData)
const mockCoincapFindByAssetId = vi.fn().mockImplementation(() => mockCGFindByAssetIdData)
const mockCoincapFindPriceHistoryByAssetId = vi
  .fn()
  .mockImplementation(() => mockCGPriceHistoryData)

vi.mock('./coincap/coincap', () => ({
  CoinCapMarketService: vi.fn().mockImplementation(() => {
    return {
      findAll: mockCoincapFindAll,
      findByAssetId: mockCoincapFindByAssetId,
      findPriceHistoryByAssetId: mockCoincapFindPriceHistoryByAssetId,
    }
  }),
}))

const mockPortalsFindByAssetId = vi.fn().mockImplementation(() => mockCGFindByAssetIdData)
const mockPortalsFindAll = vi.fn().mockImplementation(() => mockCGFindAllData)
const mockPortalsFindPriceHistoryByAssetId = vi
  .fn()
  .mockImplementation(() => mockCGPriceHistoryData)

vi.mock('./portals/portals', () => ({
  PortalsMarketService: vi.fn().mockImplementation(() => {
    return {
      findAll: mockPortalsFindAll,
      findByAssetId: mockPortalsFindByAssetId,
      findPriceHistoryByAssetId: mockPortalsFindPriceHistoryByAssetId,
    }
  }),
}))

const mockZerionFindByAssetId = vi.fn().mockImplementation(() => mockCGFindByAssetIdData)
const mockZerionFindAll = vi.fn().mockImplementation(() => mockCGFindAllData)
const mockZerionFindPriceHistoryByAssetId = vi.fn().mockImplementation(() => mockCGPriceHistoryData)

vi.mock('./zerion/zerion', () => ({
  ZerionMarketService: vi.fn().mockImplementation(() => {
    return {
      findAll: mockZerionFindAll,
      findByAssetId: mockZerionFindByAssetId,
      findPriceHistoryByAssetId: mockZerionFindPriceHistoryByAssetId,
    }
  }),
}))

const mockFoxyFindAll = vi.fn().mockImplementation(() => mockFoxyMarketData)
const mockFoxyFindByAssetId = vi.fn().mockImplementation(() => mockFoxyMarketData)
const mockFoxyFindPriceHistoryByAssetId = vi.fn().mockImplementation(() => mockFoxyPriceHistoryData)

vi.mock('./foxy/foxy', () => ({
  FoxyMarketService: vi.fn().mockImplementation(() => {
    return {
      findAll: mockFoxyFindAll,
      findByAssetId: mockFoxyFindByAssetId,
      findPriceHistoryByAssetId: mockFoxyFindPriceHistoryByAssetId,
    }
  }),
}))

const mockThorchainAssetsFindAll = vi.fn().mockImplementation(() => mockTcyMarketData)
const mockThorchainAssetsFindByAssetId = vi.fn().mockImplementation(() => mockTcyMarketData)
const mockThorchainAssetsFindPriceHistoryByAssetId = vi
  .fn()
  .mockImplementation(() => mockTcyPriceHistoryData)

vi.mock('./thorchainAssets/thorchainAssets', () => ({
  ThorchainAssetsMarketService: vi.fn().mockImplementation(() => {
    return {
      findAll: mockThorchainAssetsFindAll,
      findByAssetId: mockThorchainAssetsFindByAssetId,
      findPriceHistoryByAssetId: mockThorchainAssetsFindPriceHistoryByAssetId,
    }
  }),
}))

describe('market service', () => {
  const marketServiceManagerArgs = {
    coinGeckoAPIKey: 'dummyCoingeckoApiKey',
    provider: new ethers.JsonRpcProvider(''),
    providerUrls: {
      jsonRpcProviderUrl: '',
      unchainedEthereumWsUrl: '',
      unchainedEthereumHttpUrl: '',
    },
  }

  beforeAll(async () => {
    await initAssetService()
  })

  describe('findAll', () => {
    it('can return from first market service and skip the next', async () => {
      const marketServiceManager = new MarketServiceManager(marketServiceManagerArgs)
      const findAllArgs = { count: Number() }
      await marketServiceManager.findAll(findAllArgs)
      expect(coingeckoMock).toBeCalled() // constructor
      expect(mockCoingeckoFindAll).toBeCalledWith(findAllArgs) // this should return data
      expect(mockCoincapFindAll).not.toBeCalled() // and the next provider should not be called
    })

    it('can call the next market service if the first fails', async () => {
      const marketServiceManager = new MarketServiceManager(marketServiceManagerArgs)
      mockCoingeckoFindAll.mockRejectedValueOnce({ error: 'error' })
      const findAllArgs = { count: Number() }
      const result = await marketServiceManager.findAll(findAllArgs)
      expect(mockCoingeckoFindAll).toBeCalledWith(findAllArgs) // this will mock error
      expect(mockCoincapFindAll).toBeCalledWith(findAllArgs) // this will return
      expect(result).toEqual(mockCGFindAllData)
    })

    it('errors if no data found', async () => {
      const marketServiceManager = new MarketServiceManager(marketServiceManagerArgs)
      mockCoingeckoFindAll.mockRejectedValueOnce({ error: 'error' })
      mockCoincapFindAll.mockRejectedValueOnce({ error: 'error' })
      mockPortalsFindAll.mockRejectedValueOnce({ error: 'error' })
      mockFoxyFindAll.mockRejectedValueOnce({ error: 'error' })
      mockThorchainAssetsFindAll.mockRejectedValueOnce({ error: 'error' })
      mockZerionFindAll.mockRejectedValueOnce({ error: 'error' })
      await expect(marketServiceManager.findAll({ count: Number() })).rejects.toEqual(
        new Error('Cannot find market service provider for market data.'),
      )
    })

    it('returns market service data if exists', async () => {
      const marketServiceManager = new MarketServiceManager(marketServiceManagerArgs)
      const result = await marketServiceManager.findAll({ count: Number() })
      expect(result).toEqual(mockCGFindAllData)
    })

    it('returns next market service data if previous data does not exist', async () => {
      mockCoingeckoFindAll.mockRejectedValueOnce({ error: 'error' })
      mockCoincapFindAll.mockRejectedValueOnce({ error: 'error' })
      mockPortalsFindAll.mockRejectedValueOnce({ error: 'error' })
      mockZerionFindAll.mockRejectedValueOnce({ error: 'error' })
      const marketServiceManager = new MarketServiceManager(marketServiceManagerArgs)
      const result = await marketServiceManager.findAll({ count: Number() })
      expect(result).toEqual(mockFoxyMarketData)
    })
  })

  describe('findByAssetId', () => {
    const ethArgs = { assetId: ethAssetId }
    const btcArgs = { assetId: btcAssetId }

    it('can return from first market service and skip the next', async () => {
      const marketServiceManager = new MarketServiceManager(marketServiceManagerArgs)
      const result = await marketServiceManager.findByAssetId(ethArgs)
      expect(result).toEqual(mockCGFindByAssetIdData)
    })

    it('can return from next market service if first is not found', async () => {
      mockCoingeckoFindByAssetId.mockRejectedValueOnce({ error: 'error' })
      mockCoincapFindByAssetId.mockRejectedValueOnce({ error: 'error' })
      mockPortalsFindByAssetId.mockRejectedValueOnce({ error: 'error' })
      mockZerionFindByAssetId.mockRejectedValueOnce({ error: 'error' })
      const marketServiceManager = new MarketServiceManager(marketServiceManagerArgs)
      const result = await marketServiceManager.findByAssetId(ethArgs)
      expect(result).toEqual(mockFoxyMarketData)
    })

    it('can return null if no data found', async () => {
      mockCoingeckoFindByAssetId.mockRejectedValueOnce({ error: 'error' })
      mockCoincapFindByAssetId.mockRejectedValueOnce({ error: 'error' })
      mockPortalsFindByAssetId.mockRejectedValueOnce({ error: 'error' })
      mockFoxyFindByAssetId.mockRejectedValueOnce({ error: 'error' })
      mockThorchainAssetsFindByAssetId.mockRejectedValueOnce({ error: 'error' })
      mockZerionFindByAssetId.mockRejectedValueOnce({ error: 'error' })
      const marketServiceManager = new MarketServiceManager(marketServiceManagerArgs)
      const result = await marketServiceManager.findByAssetId(btcArgs)
      expect(result).toBeNull()
    })
  })

  describe('findPriceHistoryByAssetId', () => {
    const findPriceHistoryByAssetIdArgs = {
      assetId: 'eip155:1/slip44:60',
      timeframe: HistoryTimeframe.HOUR,
    }

    it('can return from first market service and skip the next', async () => {
      const marketServiceManager = new MarketServiceManager(marketServiceManagerArgs)
      const result = await marketServiceManager.findPriceHistoryByAssetId(
        findPriceHistoryByAssetIdArgs,
      )
      expect(result).toEqual(mockCGPriceHistoryData)
    })

    it('can return from the next market service if the first is not found', async () => {
      mockCoingeckoFindPriceHistoryByAssetId.mockRejectedValueOnce({ error: 'error' })
      mockCoincapFindPriceHistoryByAssetId.mockRejectedValueOnce({ error: 'error' })
      mockPortalsFindPriceHistoryByAssetId.mockRejectedValueOnce({ error: 'error' })
      mockZerionFindPriceHistoryByAssetId.mockRejectedValueOnce({ error: 'error' })
      const marketServiceManager = new MarketServiceManager(marketServiceManagerArgs)
      const result = await marketServiceManager.findPriceHistoryByAssetId(
        findPriceHistoryByAssetIdArgs,
      )
      expect(result).toEqual(mockFoxyPriceHistoryData)
    })

    it('can return null if no data found', async () => {
      mockCoingeckoFindPriceHistoryByAssetId.mockRejectedValueOnce({ error: 'error' })
      mockCoincapFindPriceHistoryByAssetId.mockRejectedValueOnce({ error: 'error' })
      mockPortalsFindPriceHistoryByAssetId.mockRejectedValueOnce({ error: 'error' })
      mockFoxyFindPriceHistoryByAssetId.mockRejectedValueOnce({ error: 'error' })
      mockThorchainAssetsFindPriceHistoryByAssetId.mockRejectedValueOnce({ error: 'error' })
      mockZerionFindPriceHistoryByAssetId.mockRejectedValueOnce({ error: 'error' })
      const marketServiceManager = new MarketServiceManager(marketServiceManagerArgs)
      const result = await marketServiceManager.findPriceHistoryByAssetId(
        findPriceHistoryByAssetIdArgs,
      )
      expect(result).toEqual([])
    })
  })
})
