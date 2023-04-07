import { HistoryTimeframe } from '@shapeshiftoss/types'

import { mockERHFindByFiatSymbol, mockERHPriceHistoryData } from './exchange-rates-host/erhMockData'
import { FiatMarketProviders } from './fiat-market-providers'
import { findByFiatSymbol, findPriceHistoryByFiatSymbol } from './fiat-market-service-manager'

jest.mock('./exchange-rates-host/exchange-rates-host', () => ({
  ExchangeRateHostService: jest.fn().mockImplementation(() => {
    return {
      findByFiatSymbol: jest.fn(() => mockERHFindByFiatSymbol),
      findPriceHistoryByFiatSymbol: jest.fn(() => mockERHPriceHistoryData),
    }
  }),
}))

describe('fiat market service', () => {
  describe('findByFiatSymbol', () => {
    const args = {
      symbol: <const>'EUR',
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
      symbol: <const>'EUR',
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
