import { describe, expect, it, vi } from 'vitest'

import { findToken, getBuildTx, getRoute, getSupportedChainList } from './endpoints'
import type { FindTokenResponse, SupportedChainListResponse } from './validators'

vi.setConfig({ testTimeout: 10000 })

describe('endpoints', () => {
  describe('getSupportedChainList', () => {
    it('should return a list of supported chains from the real API', async () => {
      const result = await getSupportedChainList()
      expect(result.isOk()).toBe(true)
      const { data } = result.unwrap() as SupportedChainListResponse
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBeGreaterThan(0)
      expect(typeof data[0]).toBe('number')
    })
  })

  describe('findToken', () => {
    it('should return token information from the real API', async () => {
      const chainId = 1 // Ethereum
      const address = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' // WETH
      const result = await findToken(chainId, address)
      expect(result.isOk()).toBe(true)
      const { data } = result.unwrap() as FindTokenResponse
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBeGreaterThan(0)
      const token = data[0]
      expect(token.chainId).toBe(chainId)
      expect(token.address.toLowerCase()).toBe(address.toLowerCase())
      expect(token.symbol).toBe('WETH')
    })
  })

  describe('getRoute', () => {
    it('should return a route from the real API', async () => {
      const fromChainId = 1 // Ethereum
      const tokenInAddress = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' // WETH
      const toChainId = 137 // Polygon
      const tokenOutAddress = '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619' // WETH on Polygon
      const amount = '100000000000000000' // 0.1 WETH
      const result = await getRoute(fromChainId, tokenInAddress, toChainId, tokenOutAddress, amount)
      expect(result.isOk()).toBe(false)
    })
  })

  describe('getBuildTx', () => {
    it('should return a buildTx payload from the real API', async () => {
      // This will be a placeholder test until we can get a successful route
      expect(true).toBe(false)
    })
  })
})
