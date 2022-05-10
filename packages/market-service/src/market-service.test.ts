import { HistoryTimeframe } from '@shapeshiftoss/types'

import {
  mockCGFindAllData,
  mockCGFindByAssetIdData,
  mockCGPriceHistoryData
} from './coingecko/coingeckoMockData'
import { FOXY_ASSET_ID } from './foxy/foxy'
import { mockFoxyMarketData, mockFoxyPriceHistoryData } from './foxy/foxyMockData'
import { findAll, findByAssetId, findPriceHistoryByAssetId } from './index'
import { MarketProviders } from './market-providers'
import {
  mockOsmosisFindAllData,
  mockOsmosisFindByAssetId,
  mockOsmosisYearlyHistoryData
} from './osmosis/osmosisMockData'
import {
  mockYearnFindByAssetIdData,
  mockYearnPriceHistoryData,
  mockYearnServiceFindAllData
} from './yearn/yearnMockData'

jest.mock('./coingecko/coingecko', () => ({
  CoinGeckoMarketService: jest.fn().mockImplementation(() => {
    return {
      findAll: jest.fn(() => mockCGFindAllData),
      findByAssetId: jest.fn(() => mockCGFindByAssetIdData),
      findPriceHistoryByAssetId: jest.fn(() => mockCGPriceHistoryData)
    }
  })
}))

jest.mock('./coincap/coincap', () => ({
  CoinCapMarketService: jest.fn().mockImplementation(() => {
    return {
      findAll: jest.fn(() => mockYearnServiceFindAllData),
      findByAssetId: jest.fn(() => mockYearnFindByAssetIdData),
      findPriceHistoryByAssetId: jest.fn(() => mockYearnPriceHistoryData)
    }
  })
}))

jest.mock('./yearn/yearn-vaults', () => ({
  YearnVaultMarketCapService: jest.fn().mockImplementation(() => {
    return {
      findAll: jest.fn(() => mockYearnServiceFindAllData),
      findByAssetId: jest.fn(() => mockYearnFindByAssetIdData),
      findPriceHistoryByAssetId: jest.fn(() => mockYearnPriceHistoryData)
    }
  })
}))

jest.mock('./yearn/yearn-tokens', () => ({
  YearnTokenMarketCapService: jest.fn().mockImplementation(() => {
    return {
      findAll: jest.fn(() => mockYearnServiceFindAllData),
      findByAssetId: jest.fn(() => mockYearnFindByAssetIdData),
      findPriceHistoryByAssetId: jest.fn(() => mockYearnPriceHistoryData)
    }
  })
}))

jest.mock('./osmosis/osmosis', () => ({
  OsmosisMarketService: jest.fn().mockImplementation(() => {
    return {
      findAll: jest.fn(() => mockOsmosisFindAllData),
      findByAssetId: jest.fn(() => mockOsmosisFindByAssetId),
      findPriceHistoryByAssetId: jest.fn(() => mockOsmosisYearlyHistoryData)
    }
  })
}))

jest.mock('./foxy/foxy', () => ({
  FoxyMarketService: jest.fn().mockImplementation(() => {
    return {
      findAll: jest.fn(() => ({ [FOXY_ASSET_ID]: mockFoxyMarketData })),
      findByAssetId: jest.fn(() => mockFoxyMarketData),
      findPriceHistoryByAssetId: jest.fn(() => mockFoxyPriceHistoryData)
    }
  })
}))

jest.mock('@yfi/sdk')

describe('market service', () => {
  describe('findAll', () => {
    it('can return from first market service and skip the next', async () => {
      await findAll()
      expect(MarketProviders[0].findAll).toHaveBeenCalledTimes(1)
      expect(MarketProviders[1].findAll).toHaveBeenCalledTimes(0)
    })
    it('can call the next market service if the first fails', async () => {
      // @ts-ignore
      MarketProviders[0].findAll.mockRejectedValueOnce({ error: 'error' })
      await findAll()
      expect(MarketProviders[1].findAll).toHaveBeenCalledTimes(1)
    })
    it('errors if no data found', async () => {
      // @ts-ignore
      MarketProviders[0].findAll.mockRejectedValueOnce({ error: 'error' })
      // @ts-ignore
      MarketProviders[1].findAll.mockRejectedValueOnce({ error: 'error' })
      // @ts-ignore
      MarketProviders[2].findAll.mockRejectedValueOnce({ error: 'error' })
      // @ts-ignore
      MarketProviders[3].findAll.mockRejectedValueOnce({ error: 'error' })
      // @ts-ignore
      MarketProviders[4].findAll.mockRejectedValueOnce({ error: 'error' })
      // @ts-ignore
      MarketProviders[5].findAll.mockRejectedValueOnce({ error: 'error' })
      await expect(findAll()).rejects.toEqual(
        new Error('Cannot find market service provider for market data.')
      )
    })
    it('returns market service data if exists', async () => {
      const result = await findAll()
      expect(result).toEqual(mockCGFindAllData)
    })
    it('returns next market service data if previous data does not exist', async () => {
      // @ts-ignore
      MarketProviders[0].findAll.mockRejectedValueOnce({ error: 'error' })
      const result = await findAll()
      expect(result).toEqual(mockYearnServiceFindAllData)
    })
  })

  describe('findByAssetId', () => {
    const args = {
      assetId: 'eip155:1/slip44:60'
    }
    it('can return from first market service and skip the next', async () => {
      const result = await findByAssetId(args)
      expect(result).toEqual(mockCGFindByAssetIdData)
    })
    it('can return from next market service if first is not found', async () => {
      // @ts-ignore
      MarketProviders[0].findByAssetId.mockRejectedValueOnce({ error: 'error' })
      const result = await findByAssetId(args)
      expect(result).toEqual(mockYearnFindByAssetIdData)
    })
    it('can return null if no data found', async () => {
      // @ts-ignore
      MarketProviders[0].findByAssetId.mockRejectedValueOnce({ error: 'error' })
      // @ts-ignore
      MarketProviders[1].findByAssetId.mockRejectedValueOnce({ error: 'error' })
      // @ts-ignore
      MarketProviders[2].findByAssetId.mockRejectedValueOnce({ error: 'error' })
      // @ts-ignore
      MarketProviders[3].findByAssetId.mockRejectedValueOnce({ error: 'error' })
      // @ts-ignore
      MarketProviders[4].findByAssetId.mockRejectedValueOnce({ error: 'error' })
      // @ts-ignore
      MarketProviders[5].findByAssetId.mockRejectedValueOnce({ error: 'error' })
      const result = await findByAssetId(args)
      expect(result).toBeNull()
    })
  })

  describe('findPriceHistoryByAssetId', () => {
    const args = {
      assetId: 'eip155:1/slip44:60',
      timeframe: HistoryTimeframe.HOUR
    }
    it('can return from fist market service and skip the next', async () => {
      const result = await findPriceHistoryByAssetId(args)
      expect(result).toEqual(mockCGPriceHistoryData)
    })
    it('can return from the next market service if the first is not found', async () => {
      // @ts-ignore
      MarketProviders[0].findPriceHistoryByAssetId.mockRejectedValueOnce({ error: 'error' })
      // @ts-ignore
      MarketProviders[1].findPriceHistoryByAssetId.mockRejectedValueOnce({ error: 'error' })
      const result = await findPriceHistoryByAssetId(args)
      expect(result).toEqual(mockYearnPriceHistoryData)
    })
    it('can return null if no data found', async () => {
      // @ts-ignore
      MarketProviders[0].findPriceHistoryByAssetId.mockRejectedValueOnce({ error: 'error' })
      // @ts-ignore
      MarketProviders[1].findPriceHistoryByAssetId.mockRejectedValueOnce({ error: 'error' })
      // @ts-ignore
      MarketProviders[2].findPriceHistoryByAssetId.mockRejectedValueOnce({ error: 'error' })
      // @ts-ignore
      MarketProviders[3].findPriceHistoryByAssetId.mockRejectedValueOnce({ error: 'error' })
      // @ts-ignore
      MarketProviders[4].findPriceHistoryByAssetId.mockRejectedValueOnce({ error: 'error' })
      // @ts-ignore
      MarketProviders[5].findPriceHistoryByAssetId.mockRejectedValueOnce({ error: 'error' })
      const result = await findPriceHistoryByAssetId(args)
      expect(result).toEqual([])
    })
  })
})
