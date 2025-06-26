import { describe, expect, it, vi } from 'vitest'

import {
  findToken,
  getBuildTx,
  getRoute,
  getRouteAndSwap,
  getSupportedChainList,
  isBuildTxSuccess,
  isRouteAndSwapSuccess,
  isRouteSuccess,
} from './xhr'

vi.setConfig({ testTimeout: 10000 })

describe('endpoints', () => {
  describe('getSupportedChainList', () => {
    it('should return a list of supported chains from the real API', async () => {
      const result = await getSupportedChainList()
      result.match({
        ok: response => {
          expect(response.errno).toBe(0)
          expect(Array.isArray(response.data)).toBe(true)
          expect(response.data.length).toBeGreaterThan(0)
        },
        err: error => {
          expect.fail(JSON.stringify(error))
        },
      })
    })
  })

  describe('findToken', () => {
    it('should return token information from the real API', async () => {
      const chainId = 1 // Ethereum
      const address = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' // WETH
      const result = await findToken(chainId, address)
      result.match({
        ok: response => {
          expect(response.errno).toBe(0)
          const token = response.data.find(
            t => t.address.toLowerCase() === address.toLowerCase() && t.chainId === chainId,
          )
          expect(token).toBeDefined()
        },
        err: error => {
          expect.fail(JSON.stringify(error))
        },
      })
    })
  })

  describe('getRoute', () => {
    it('should return a route from the real API', async () => {
      const fromChainId = 137 // Polygon
      const tokenInAddress = '0x2791bca1f2de4661ed88a30c99a7a9449aa84174' // USDC on Polygon
      const toChainId = 137 // Polygon
      const tokenOutAddress = '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619' // WETH on Polygon
      const amount = '1000000' // 1 USDC
      const slippage = '150'
      const result = await getRoute(
        fromChainId,
        tokenInAddress,
        toChainId,
        tokenOutAddress,
        amount,
        slippage,
      )
      result.match({
        ok: response => {
          expect(isRouteSuccess(response)).toBe(true)
          if (!isRouteSuccess(response)) {
            expect.fail(`Unexpected errno in ok branch: ${response.errno}`)
            return
          }
          const route = response.data[0]
          expect(route).toBeDefined()
          expect(route).toHaveProperty('hash')
        },
        err: error => {
          if (!error.message.includes('Insufficient Liquidity')) {
            expect.fail(error.message)
          }
        },
      })
    })
  })

  describe('getBuildTx', () => {
    it('should get a buildTx payload for a valid hash', async () => {
      const fromChainId = 137 // Polygon
      const tokenInAddress = '0x2791bca1f2de4661ed88a30c99a7a9449aa84174' // USDC on Polygon
      const toChainId = 137 // Polygon
      const tokenOutAddress = '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619' // WETH on Polygon
      const amount = '1000000' // 1 USDC

      const slippage = '150'
      const routeResult = await getRoute(
        fromChainId,
        tokenInAddress,
        toChainId,
        tokenOutAddress,
        amount,
        slippage,
      )

      await routeResult.match({
        ok: async routeResponse => {
          expect(isRouteSuccess(routeResponse)).toBe(true)
          if (!isRouteSuccess(routeResponse)) {
            expect.fail(`getRoute failed in getBuildTx test: ${routeResponse.errno}`)
            return
          }
          const route = routeResponse.data[0]
          expect(route).toBeDefined()
          const hash = route.hash
          const from = '0x2D4C407BBe49438ED859fe965b140dcF1aaB71a9'
          const receiver = '0x2D4C407BBe49438ED859fe965b140dcF1aaB71a9'

          const buildTxResult = await getBuildTx(hash, slippage, from, receiver)
          buildTxResult.match({
            ok: buildTxResponse => {
              expect(isBuildTxSuccess(buildTxResponse)).toBe(true)
            },
            err: error => {
              expect.fail(`getBuildTx failed for a valid hash: ${error.message}`)
            },
          })
        },
        err: async error => {
          // This can happen due to lack of liquidity, which is a valid but unpredictable API response
          console.warn(`getRoute failed, skipping getBuildTx test: ${error.message}`)
          await Promise.resolve()
        },
      })
    })

    it('should fail for an expired hash', async () => {
      const hash = '0xf0aba09e5aaf9b1301feeeef44a2525a783fd64c86485959a60010ca215a3337'
      const slippage = '150'
      const from = '0x2D4C407BBe49438ED859fe965b140dcF1aaB71a9'
      const receiver = '0x2D4C407BBe49438ED859fe965b140dcF1aaB71a9'
      const result = await getBuildTx(hash, slippage, from, receiver)

      result.match({
        ok: response => {
          expect.fail(`getBuildTx succeeded with an expired hash: ${JSON.stringify(response)}`)
        },
        err: error => {
          expect(error).toBeDefined()
          expect(error.message).toContain('[getBuildTx] Parameter error: Invalid or expired hash')
        },
      })
    })
  })

  describe('getRouteAndSwap', () => {
    it('should return route and swap data from the real API', async () => {
      const fromChainId = 137
      const tokenInAddress = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
      const toChainId = 137
      const tokenOutAddress = '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'
      const amount = '1000000'
      const from = '0x348C4e6C9B3237A6c4226D654822BD969A72e841'
      const receiver = '0x348C4e6C9B3237A6c4226D654822BD969A72e841'
      const slippage = '150'
      const result = await getRouteAndSwap(
        fromChainId,
        tokenInAddress,
        toChainId,
        tokenOutAddress,
        amount,
        from,
        receiver,
        slippage,
      )
      result.match({
        ok: response => {
          expect(isRouteAndSwapSuccess(response)).toBe(true)
        },
        err: error => {
          expect.fail(error.message)
        },
      })
    })
  })
})
