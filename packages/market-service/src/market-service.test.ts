import { HistoryTimeframe } from '@shapeshiftoss/types'

import {
  mockCGFindAllData,
  mockCGFindByCaip19Data,
  mockCGPriceHistoryData
} from './coingecko/coingeckoMockData'
import { findAll, findByCaip19, findPriceHistoryByCaip19 } from './index'
import { MarketProviders } from './market-providers'
import {
  mockYearnFindByCaip19Data,
  mockYearnPriceHistoryData,
  mockYearnServiceFindAllData
} from './yearn/yearnMockData'

jest.mock('./coingecko/coingecko', () => ({
  CoinGeckoMarketService: jest.fn().mockImplementation(() => {
    return {
      findAll: jest.fn(() => mockCGFindAllData),
      findByCaip19: jest.fn(() => mockCGFindByCaip19Data),
      findPriceHistoryByCaip19: jest.fn(() => mockCGPriceHistoryData)
    }
  })
}))

jest.mock('./coincap/coincap', () => ({
  CoinCapMarketService: jest.fn().mockImplementation(() => {
    return {
      findAll: jest.fn(() => mockYearnServiceFindAllData),
      findByCaip19: jest.fn(() => mockYearnFindByCaip19Data),
      findPriceHistoryByCaip19: jest.fn(() => mockYearnPriceHistoryData)
    }
  })
}))

jest.mock('./yearn/yearn-vaults', () => ({
  YearnVaultMarketCapService: jest.fn().mockImplementation(() => {
    return {
      findAll: jest.fn(() => mockYearnServiceFindAllData),
      findByCaip19: jest.fn(() => mockYearnFindByCaip19Data),
      findPriceHistoryByCaip19: jest.fn(() => mockYearnPriceHistoryData)
    }
  })
}))

jest.mock('./yearn/yearn-tokens', () => ({
  YearnTokenMarketCapService: jest.fn().mockImplementation(() => {
    return {
      findAll: jest.fn(() => mockYearnServiceFindAllData),
      findByCaip19: jest.fn(() => mockYearnFindByCaip19Data),
      findPriceHistoryByCaip19: jest.fn(() => mockYearnPriceHistoryData)
    }
  })
}))

jest.mock('@yfi/sdk')

describe('coingecko market service', () => {
  describe('findAll', () => {
    it('can return from coingecko and skip yearn', async () => {
      await findAll()
      expect(MarketProviders[0].findAll).toHaveBeenCalledTimes(1)
      expect(MarketProviders[1].findAll).toHaveBeenCalledTimes(0)
    })
    it('can call coincap if coingecko fails', async () => {
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
      await expect(findAll()).rejects.toEqual(
        new Error('Cannot find market service provider for market data.')
      )
    })
    it('returns coingecko data if exists', async () => {
      const result = await findAll()
      expect(result).toEqual(mockCGFindAllData)
    })
    it('returns yearn data if coingecko does not exist', async () => {
      // @ts-ignore
      MarketProviders[0].findAll.mockRejectedValueOnce({ error: 'error' })
      const result = await findAll()
      expect(result).toEqual(mockYearnServiceFindAllData)
    })
  })

  describe('findByCaip19', () => {
    const args = {
      caip19: 'eip155:1/slip44:60'
    }
    it('can return from coingecko and skip yearn', async () => {
      const result = await findByCaip19(args)
      expect(result).toEqual(mockCGFindByCaip19Data)
    })
    it('can return from yearn if coingecko is not found', async () => {
      // @ts-ignore
      MarketProviders[0].findByCaip19.mockRejectedValueOnce({ error: 'error' })
      const result = await findByCaip19(args)
      expect(result).toEqual(mockYearnFindByCaip19Data)
    })
    it('can return null if no data found', async () => {
      // @ts-ignore
      MarketProviders[0].findByCaip19.mockRejectedValueOnce({ error: 'error' })
      // @ts-ignore
      MarketProviders[1].findByCaip19.mockRejectedValueOnce({ error: 'error' })
      // @ts-ignore
      MarketProviders[2].findByCaip19.mockRejectedValueOnce({ error: 'error' })
      // @ts-ignore
      MarketProviders[3].findByCaip19.mockRejectedValueOnce({ error: 'error' })
      const result = await findByCaip19(args)
      expect(result).toBeNull()
    })
  })

  describe('findPriceHistoryByCaip19', () => {
    const args = {
      caip19: 'eip155:1/slip44:60',
      timeframe: HistoryTimeframe.HOUR
    }
    it('can return from coingecko and skip yearn', async () => {
      const result = await findPriceHistoryByCaip19(args)
      expect(result).toEqual(mockCGPriceHistoryData)
    })
    it('can return from yearn if coingecko is not found', async () => {
      // @ts-ignore
      MarketProviders[0].findPriceHistoryByCaip19.mockRejectedValueOnce({ error: 'error' })
      // @ts-ignore
      MarketProviders[1].findPriceHistoryByCaip19.mockRejectedValueOnce({ error: 'error' })
      const result = await findPriceHistoryByCaip19(args)
      expect(result).toEqual(mockYearnPriceHistoryData)
    })
    it('can return null if no data found', async () => {
      // @ts-ignore
      MarketProviders[0].findPriceHistoryByCaip19.mockRejectedValueOnce({ error: 'error' })
      // @ts-ignore
      MarketProviders[1].findPriceHistoryByCaip19.mockRejectedValueOnce({ error: 'error' })
      // @ts-ignore
      MarketProviders[2].findPriceHistoryByCaip19.mockRejectedValueOnce({ error: 'error' })
      // @ts-ignore
      MarketProviders[3].findPriceHistoryByCaip19.mockRejectedValueOnce({ error: 'error' })
      const result = await findPriceHistoryByCaip19(args)
      expect(result).toEqual([])
    })
  })
})
