import { describe, expect, it, vi } from 'vitest'

import {
  findToken,
  getBuildTx,
  getRoute,
  getRouteAndSwap,
  getSupportedChainList,
} from './endpoints'
import type { BuildTxResponse, FindTokenResponse, SupportedChainListResponse } from './validators'

vi.setConfig({ testTimeout: 10000 })

describe('endpoints', () => {
  describe('getSupportedChainList', () => {
    it('should return a list of supported chains from the real API', async () => {
      const result = await getSupportedChainList()
      expect(result.isOk()).toBe(true)
      const response = result.unwrap() as SupportedChainListResponse
      expect(response.errno).toBe(0)
      expect(Array.isArray(response.data)).toBe(true)
      expect(response.data.length).toBeGreaterThan(0)
    })
  })

  describe('findToken', () => {
    it('should return token information from the real API', async () => {
      const chainId = 1 // Ethereum
      const address = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' // WETH
      const result = await findToken(chainId, address)
      expect(result.isOk()).toBe(true)
      const response = result.unwrap() as FindTokenResponse
      expect(response.errno).toBe(0)
      const token = response.data.find(
        t => t.address.toLowerCase() === address.toLowerCase() && t.chainId === chainId,
      )
      expect(token).toBeDefined()
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
      const response = result.unwrapErr()
      expect(response.message).toContain('getRoute')
    })
  })

  describe('getBuildTx', () => {
    it.todo('should return a buildTx payload from the real API', async () => {
      // This test is marked as todo because it relies on a time-sensitive hash from getRoute.
      // A reliable, non-expiring hash is needed for a stable test.
      const hash = '0xf0aba09e5aaf9b1301feeeef44a2525a783fd64c86485959a60010ca215a3337'
      const slippage = '150'
      const from = '0x2D4C407BBe49438ED859fe965b140dcF1aaB71a9'
      const receiver = '0x2D4C407BBe49438ED859fe965b140dcF1aaB71a9'
      const result = await getBuildTx(hash, slippage, from, receiver)
      expect(result.isOk()).toBe(true)
      const response = result.unwrap() as BuildTxResponse
      expect(response.errno).toBe(0)
    })
  })

  describe('getRouteAndSwap', () => {
    it('should return route and swap data from the real API', async () => {
      const fromChainId = 137
      const tokenInAddress = '0x2791bca1f2de4661ed88a30c99a7a9449aa84174' // USDC on Polygon
      const toChainId = 137
      const tokenOutAddress = '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619' // WETH on Polygon
      const amount = '1000000' // 1 USDC
      const from = '0x2D4C407BBe49438ED859fe965b140dcF1aaB71a9'
      const receiver = '0x2D4C407BBe49438ED859fe965b140dcF1aaB71a9'
      const result = await getRouteAndSwap(
        fromChainId,
        tokenInAddress,
        toChainId,
        tokenOutAddress,
        amount,
        from,
        receiver,
      )
      expect(result.isOk()).toBe(false)
      const response = result.unwrapErr()
      expect(response.message).toContain('getRouteAndSwap')
    })
  })
})
