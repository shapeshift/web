import { HistoryTimeframe } from '@shapeshiftoss/types'

import { CoinGeckoMarketService } from './coingecko/coingecko'
import {
  mockCGFindAllData,
  mockCGFindByAssetIdData,
  mockCGPriceHistoryData,
} from './coingecko/coingeckoMockData'
import { mockFoxyMarketData, mockFoxyPriceHistoryData } from './foxy/foxyMockData'
import {
  mockIdleFindByAssetIdData,
  mockIdlePriceHistoryData,
  mockIdleServiceFindAllData,
} from './idle/idleMockData'
import { MarketServiceManager } from './market-service-manager'
import {
  mockOsmosisFindAllData,
  mockOsmosisFindByAssetIdData,
  mockOsmosisYearlyHistoryData,
} from './osmosis/osmosisMockData'
import {
  mockYearnFindByAssetIdData,
  mockYearnPriceHistoryData,
  mockYearnServiceFindAllData,
} from './yearn/yearnMockData'

const mockCoingeckoFindAll = jest.fn().mockImplementation(() => mockCGFindAllData)
const mockCoingeckoFindByAssetId = jest.fn().mockImplementation(() => mockCGFindByAssetIdData)
const mockCoingeckoFindPriceHistoryByAssetId = jest
  .fn()
  .mockImplementation(() => mockCGPriceHistoryData)

jest.mock('./coingecko/coingecko', () => ({
  CoinGeckoMarketService: jest.fn().mockImplementation(() => ({
    findAll: mockCoingeckoFindAll,
    findByAssetId: mockCoingeckoFindByAssetId,
    findPriceHistoryByAssetId: mockCoingeckoFindPriceHistoryByAssetId,
  })),
}))

const coingeckoMock = jest.mocked(CoinGeckoMarketService)

const mockCoincapFindAll = jest.fn().mockImplementation(() => mockCGFindAllData)
const mockCoincapFindByAssetId = jest.fn().mockImplementation(() => mockCGFindByAssetIdData)
const mockCoincapFindPriceHistoryByAssetId = jest
  .fn()
  .mockImplementation(() => mockCGPriceHistoryData)

jest.mock('./coincap/coincap', () => ({
  CoinCapMarketService: jest.fn().mockImplementation(() => {
    return {
      findAll: mockCoincapFindAll,
      findByAssetId: mockCoincapFindByAssetId,
      findPriceHistoryByAssetId: mockCoincapFindPriceHistoryByAssetId,
    }
  }),
}))

const mockYearnVaultFindAll = jest.fn().mockImplementation(() => mockYearnServiceFindAllData)
const mockYearnVaultFindByAssetId = jest.fn().mockImplementation(() => mockYearnFindByAssetIdData)
const mockYearnVaultFindPriceHistoryByAssetId = jest
  .fn()
  .mockImplementation(() => mockYearnPriceHistoryData)

jest.mock('./yearn/yearn-vaults', () => ({
  YearnVaultMarketCapService: jest.fn().mockImplementation(() => {
    return {
      findAll: mockYearnVaultFindAll,
      findByAssetId: mockYearnVaultFindByAssetId,
      findPriceHistoryByAssetId: mockYearnVaultFindPriceHistoryByAssetId,
    }
  }),
}))

const mockIdleFindAll = jest.fn().mockImplementation(() => mockIdleServiceFindAllData)
const mockIdleFindByAssetId = jest.fn().mockImplementation(() => mockIdleFindByAssetIdData)
const mockIdleFindPriceHistoryByAssetId = jest
  .fn()
  .mockImplementation(() => mockIdlePriceHistoryData)

jest.mock('./idle/idle', () => ({
  IdleMarketService: jest.fn().mockImplementation(() => {
    return {
      findAll: mockIdleFindAll,
      findByAssetId: mockIdleFindByAssetId,
      findPriceHistoryByAssetId: mockIdleFindPriceHistoryByAssetId,
    }
  }),
}))

const mockYearnTokenFindAll = jest.fn().mockImplementation(() => mockYearnServiceFindAllData)
const mockYearnTokenFindByAssetId = jest.fn().mockImplementation(() => mockYearnFindByAssetIdData)
const mockYearnTokenFindPriceHistoryByAssetId = jest
  .fn()
  .mockImplementation(() => mockYearnPriceHistoryData)

jest.mock('./yearn/yearn-tokens', () => ({
  YearnTokenMarketCapService: jest.fn().mockImplementation(() => {
    return {
      findAll: mockYearnTokenFindAll,
      findByAssetId: mockYearnTokenFindByAssetId,
      findPriceHistoryByAssetId: mockYearnTokenFindPriceHistoryByAssetId,
    }
  }),
}))

const mockOsmosisFindAll = jest.fn().mockImplementation(() => mockOsmosisFindAllData)
const mockOsmosisFindByAssetId = jest.fn().mockImplementation(() => mockOsmosisFindByAssetIdData)
const mockOsmosisFindPriceHistoryByAssetId = jest
  .fn()
  .mockImplementation(() => mockOsmosisYearlyHistoryData)

jest.mock('./osmosis/osmosis', () => ({
  OsmosisMarketService: jest.fn().mockImplementation(() => {
    return {
      findAll: mockOsmosisFindAll,
      findByAssetId: mockOsmosisFindByAssetId,
      findPriceHistoryByAssetId: mockOsmosisFindPriceHistoryByAssetId,
    }
  }),
}))

const mockFoxyFindAll = jest.fn().mockImplementation(() => mockFoxyMarketData)
const mockFoxyFindByAssetId = jest.fn().mockImplementation(() => mockFoxyMarketData)
const mockFoxyFindPriceHistoryByAssetId = jest
  .fn()
  .mockImplementation(() => mockFoxyPriceHistoryData)

jest.mock('./foxy/foxy', () => ({
  FoxyMarketService: jest.fn().mockImplementation(() => {
    return {
      findAll: mockFoxyFindAll,
      findByAssetId: mockFoxyFindByAssetId,
      findPriceHistoryByAssetId: mockFoxyFindPriceHistoryByAssetId,
    }
  }),
}))

jest.mock('@yfi/sdk')

describe('market service', () => {
  const marketServiceManagerArgs = {
    coinGeckoAPIKey: 'dummyCoingeckoApiKey',
    yearnChainReference: 1 as const,
    providerUrls: {
      jsonRpcProviderUrl: '',
      unchainedEthereumWsUrl: '',
      unchainedEthereumHttpUrl: '',
      osmosisMarketDataUrl: '',
      osmosisPoolMetadataUrl: '',
    },
  }

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
      mockYearnVaultFindAll.mockRejectedValueOnce({ error: 'error' })
      mockYearnTokenFindAll.mockRejectedValueOnce({ error: 'error' })
      mockOsmosisFindAll.mockRejectedValueOnce({ error: 'error' })
      mockFoxyFindAll.mockRejectedValueOnce({ error: 'error' })
      mockIdleFindAll.mockRejectedValueOnce({ error: 'error' })
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
      const marketServiceManager = new MarketServiceManager(marketServiceManagerArgs)
      const result = await marketServiceManager.findAll({ count: Number() })
      expect(result).toEqual(mockYearnServiceFindAllData)
    })
  })

  describe('findByAssetId', () => {
    const args = { assetId: 'eip155:1/slip44:60' }

    it('can return from first market service and skip the next', async () => {
      const marketServiceManager = new MarketServiceManager(marketServiceManagerArgs)
      const result = await marketServiceManager.findByAssetId(args)
      expect(result).toEqual(mockCGFindByAssetIdData)
    })

    it('can return from next market service if first is not found', async () => {
      mockCoingeckoFindByAssetId.mockRejectedValueOnce({ error: 'error' })
      mockCoincapFindByAssetId.mockRejectedValueOnce({ error: 'error' })
      const marketServiceManager = new MarketServiceManager(marketServiceManagerArgs)
      const result = await marketServiceManager.findByAssetId(args)
      expect(result).toEqual(mockYearnFindByAssetIdData)
    })

    it('can return null if no data found', async () => {
      mockCoingeckoFindByAssetId.mockRejectedValueOnce({ error: 'error' })
      mockCoincapFindByAssetId.mockRejectedValueOnce({ error: 'error' })
      mockYearnVaultFindByAssetId.mockRejectedValueOnce({ error: 'error' })
      mockYearnTokenFindByAssetId.mockRejectedValueOnce({ error: 'error' })
      mockOsmosisFindByAssetId.mockRejectedValueOnce({ error: 'error' })
      mockFoxyFindByAssetId.mockRejectedValueOnce({ error: 'error' })
      mockIdleFindByAssetId.mockRejectedValueOnce({ error: 'error' })
      const marketServiceManager = new MarketServiceManager(marketServiceManagerArgs)
      const result = await marketServiceManager.findByAssetId(args)
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
      const marketServiceManager = new MarketServiceManager(marketServiceManagerArgs)
      const result = await marketServiceManager.findPriceHistoryByAssetId(
        findPriceHistoryByAssetIdArgs,
      )
      expect(result).toEqual(mockYearnPriceHistoryData)
    })

    it('can return null if no data found', async () => {
      mockCoingeckoFindPriceHistoryByAssetId.mockRejectedValueOnce({ error: 'error' })
      mockCoincapFindPriceHistoryByAssetId.mockRejectedValueOnce({ error: 'error' })
      mockYearnVaultFindPriceHistoryByAssetId.mockRejectedValueOnce({ error: 'error' })
      mockYearnTokenFindPriceHistoryByAssetId.mockRejectedValueOnce({ error: 'error' })
      mockOsmosisFindPriceHistoryByAssetId.mockRejectedValueOnce({ error: 'error' })
      mockFoxyFindPriceHistoryByAssetId.mockRejectedValueOnce({ error: 'error' })
      mockIdleFindPriceHistoryByAssetId.mockRejectedValueOnce({ error: 'error' })
      const marketServiceManager = new MarketServiceManager(marketServiceManagerArgs)
      const result = await marketServiceManager.findPriceHistoryByAssetId(
        findPriceHistoryByAssetIdArgs,
      )
      expect(result).toEqual([])
    })
  })
})
