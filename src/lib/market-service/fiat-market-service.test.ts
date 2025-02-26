import { HistoryTimeframe } from '@shapeshiftoss/types'
import { describe, expect, it, vi } from 'vitest'

import { mockERHFindByFiatSymbol, mockERHPriceHistoryData } from './exchange-rates-host/erhMockData'
import { FiatMarketProviders } from './fiat-market-providers'
import { findByFiatSymbol, findPriceHistoryByFiatSymbol } from './fiat-market-service-manager'

vi.mock('./exchange-rates-host/exchange-rates-host', () => ({
  ExchangeRateHostService: vi.fn().mockImplementation(() => {
    return {
      findByFiatSymbol: vi.fn(() => mockERHFindByFiatSymbol),
      findPriceHistoryByFiatSymbol: vi.fn(() => mockERHPriceHistoryData),
    }
  }),
}))

describe('fiat market service', () => {
  describe('findByFiatSymbol', () => {
    const args = {
      symbol: 'EUR' as const,
    }
    it('can return from first market service and skip the next', async () => {
      const result = await findByFiatSymbol(args)
      expect(result).toEqual(mockERHFindByFiatSymbol)
    })
    it('can return null if no data found', async () => {
      // @ts-ignore
      FiatMarketProviders[0].findByFiatSymbol.mockRejectedValueOnce({ error: 'error' })
      const result = await findByFiatSymbol(args)
      expect(result).toBeNull()
    })
  })

  describe('findPriceHistoryByFiatSymbol', () => {
    const args = {
      symbol: 'EUR' as const,
      timeframe: HistoryTimeframe.HOUR,
    }
    it('can return from first market service and skip the next', async () => {
      const result = await findPriceHistoryByFiatSymbol(args)
      expect(result).toEqual(mockERHPriceHistoryData)
    })
    it('can return an empty array if no data found', async () => {
      // @ts-ignore
      FiatMarketProviders[0].findPriceHistoryByFiatSymbol.mockRejectedValueOnce({ error: 'error' })
      const result = await findPriceHistoryByFiatSymbol(args)
      expect(result).toEqual([])
    })
  })
})
