import { describe, expect, it } from 'vitest'

import { PositionSide, TimeInForce } from './types'
import {
  buildLimitOrderType,
  buildOrderRequest,
  formatFundingRate,
  formatLeverage,
  formatPercent,
  formatPrice,
  formatPriceWithCommas,
  formatSize,
  formatSizeWithCommas,
  formatUsdValue,
  getOrderbookMidPrice,
  getOrderbookSpread,
  getPositionSide,
  parseLeverageInput,
  parseOrderbook,
} from './utils'

describe('utils', () => {
  describe('formatPrice', () => {
    it('should format price with default 2 decimals', () => {
      expect(formatPrice('1234.5678')).toBe('1234.57')
    })

    it('should format price with custom decimals', () => {
      expect(formatPrice('1234.5678', 4)).toBe('1234.5678')
    })

    it('should return 0.00 for zero value', () => {
      expect(formatPrice('0')).toBe('0.00')
    })
  })

  describe('formatPriceWithCommas', () => {
    it('should format price with commas', () => {
      expect(formatPriceWithCommas('1234567.89')).toBe('1,234,567.89')
    })

    it('should return 0.00 for zero value', () => {
      expect(formatPriceWithCommas('0')).toBe('0.00')
    })
  })

  describe('formatSize', () => {
    it('should format size with default 4 decimals', () => {
      expect(formatSize('0.123456789')).toBe('0.1235')
    })

    it('should format size with custom decimals', () => {
      expect(formatSize('0.123456789', 6)).toBe('0.123457')
    })

    it('should return 0 for zero value', () => {
      expect(formatSize('0')).toBe('0')
    })
  })

  describe('formatSizeWithCommas', () => {
    it('should format size with commas', () => {
      expect(formatSizeWithCommas('1234.5678')).toBe('1,234.5678')
    })
  })

  describe('formatUsdValue', () => {
    it('should format positive USD value', () => {
      expect(formatUsdValue('1234.56')).toBe('$1,234.56')
    })

    it('should format negative USD value with minus sign', () => {
      expect(formatUsdValue('-1234.56')).toBe('-$1,234.56')
    })

    it('should return $0.00 for zero value', () => {
      expect(formatUsdValue('0')).toBe('$0.00')
    })
  })

  describe('formatPercent', () => {
    it('should format positive percentage', () => {
      expect(formatPercent('0.05')).toBe('+5.00%')
    })

    it('should format negative percentage', () => {
      expect(formatPercent('-0.05')).toBe('-5.00%')
    })

    it('should format zero percentage', () => {
      expect(formatPercent('0')).toBe('0.00%')
    })
  })

  describe('formatFundingRate', () => {
    it('should format positive funding rate', () => {
      expect(formatFundingRate('0.0001')).toBe('+0.0100%')
    })

    it('should format negative funding rate', () => {
      expect(formatFundingRate('-0.0001')).toBe('-0.0100%')
    })
  })

  describe('formatLeverage', () => {
    it('should format leverage with x suffix', () => {
      expect(formatLeverage(10)).toBe('10x')
      expect(formatLeverage(1)).toBe('1x')
      expect(formatLeverage(100)).toBe('100x')
    })
  })

  describe('parseLeverageInput', () => {
    it('should parse numeric input', () => {
      expect(parseLeverageInput('10')).toBe(10)
    })

    it('should parse input with x suffix', () => {
      expect(parseLeverageInput('10x')).toBe(10)
      expect(parseLeverageInput('10X')).toBe(10)
    })

    it('should return null for invalid input', () => {
      expect(parseLeverageInput('abc')).toBe(null)
      expect(parseLeverageInput('0')).toBe(null)
      expect(parseLeverageInput('-1')).toBe(null)
    })
  })

  describe('buildLimitOrderType', () => {
    it('should build limit order type with default GTC', () => {
      const orderType = buildLimitOrderType()

      expect(orderType).toEqual({
        limit: { tif: TimeInForce.GoodTilCanceled },
      })
    })

    it('should build limit order type with specified TIF', () => {
      const orderType = buildLimitOrderType(TimeInForce.AddLiquidityOnly)

      expect(orderType).toEqual({
        limit: { tif: TimeInForce.AddLiquidityOnly },
      })
    })
  })

  describe('buildOrderRequest', () => {
    it('should build correct order request structure', () => {
      const request = buildOrderRequest({
        assetIndex: 0,
        isBuy: true,
        price: '50000.00',
        size: '0.1',
      })

      expect(request.a).toBe(0)
      expect(request.b).toBe(true)
      expect(request.p).toBe('50000.00')
      expect(request.s).toBe('0.1')
      expect(request.r).toBe(false)
      expect(request.t).toEqual({ limit: { tif: 'Gtc' } })
    })

    it('should include reduceOnly when specified', () => {
      const request = buildOrderRequest({
        assetIndex: 0,
        isBuy: false,
        price: '50000.00',
        size: '0.1',
        reduceOnly: true,
      })

      expect(request.r).toBe(true)
    })

    it('should include cloid when specified', () => {
      const request = buildOrderRequest({
        assetIndex: 0,
        isBuy: true,
        price: '50000.00',
        size: '0.1',
        cloid: 'my-order-id',
      })

      expect(request.c).toBe('my-order-id')
    })
  })

  describe('parseOrderbook', () => {
    it('should parse L2 book data correctly', () => {
      const l2BookData = {
        coin: 'BTC',
        levels: [
          [
            ['50000', '1.5', 1],
            ['49999', '2.0', 2],
          ],
          [
            ['50001', '1.0', 1],
            ['50002', '0.5', 2],
          ],
        ],
        time: 1234567890,
      }

      const result = parseOrderbook(l2BookData as never)

      expect(result.coin).toBe('BTC')
      expect(result.bids.length).toBe(2)
      expect(result.asks.length).toBe(2)
      expect(result.bids[0].price).toBe('50000')
      expect(result.bids[0].size).toBe('1.5')
      expect(result.asks[0].price).toBe('50001')
      expect(result.asks[0].size).toBe('1.0')
    })

    it('should calculate cumulative totals', () => {
      const l2BookData = {
        coin: 'ETH',
        levels: [
          [
            ['3000', '10', 1],
            ['2999', '20', 2],
          ],
          [
            ['3001', '15', 1],
            ['3002', '25', 2],
          ],
        ],
        time: 1234567890,
      }

      const result = parseOrderbook(l2BookData as never)

      expect(result.bids[0].total).toBe('10')
      expect(result.bids[1].total).toBe('30')
      expect(result.asks[0].total).toBe('15')
      expect(result.asks[1].total).toBe('40')
    })
  })

  describe('getOrderbookMidPrice', () => {
    it('should calculate mid price from orderbook', () => {
      const orderbook = {
        coin: 'BTC',
        bids: [{ price: '50000', size: '1', total: '1' }],
        asks: [{ price: '50100', size: '1', total: '1' }],
        time: 1234567890,
      }

      const midPrice = getOrderbookMidPrice(orderbook)

      expect(midPrice).toBe('50050')
    })

    it('should return null for empty orderbook', () => {
      const orderbook = {
        coin: 'BTC',
        bids: [],
        asks: [],
        time: 1234567890,
      }

      const midPrice = getOrderbookMidPrice(orderbook)

      expect(midPrice).toBeNull()
    })
  })

  describe('getOrderbookSpread', () => {
    it('should calculate spread from orderbook', () => {
      const orderbook = {
        coin: 'BTC',
        bids: [{ price: '50000', size: '1', total: '1' }],
        asks: [{ price: '50100', size: '1', total: '1' }],
        time: 1234567890,
      }

      const spread = getOrderbookSpread(orderbook)

      expect(spread).toBe('100')
    })

    it('should return null for empty orderbook', () => {
      const orderbook = {
        coin: 'BTC',
        bids: [],
        asks: [],
        time: 1234567890,
      }

      const spread = getOrderbookSpread(orderbook)

      expect(spread).toBeNull()
    })
  })

  describe('getPositionSide', () => {
    it('should return Long for positive size', () => {
      expect(getPositionSide('0.1')).toBe(PositionSide.Long)
    })

    it('should return Short for negative size', () => {
      expect(getPositionSide('-0.1')).toBe(PositionSide.Short)
    })

    it('should return null for zero size', () => {
      expect(getPositionSide('0')).toBeNull()
    })
  })
})
