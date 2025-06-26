import { describe, expect, it, vi } from 'vitest'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../constants'
import { SwapperName } from '../../types'
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
      const slippageDecimal = getDefaultSlippageDecimalPercentageForSwapper(SwapperName.ButterSwap)
      const slippage = (Number(slippageDecimal) * 10000).toString()
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
          console.log('getRoute result:', JSON.stringify(response, null, 2))
          expect(isRouteSuccess(response)).toBe(true)
          if (!isRouteSuccess(response)) {
            expect.fail(`Unexpected errno in ok branch: ${response.errno}`)
            return
          }
          const route = response.data[0]
          console.log('route:', JSON.stringify(route, null, 2))
          expect(route).toBeDefined()
          expect(route).toHaveProperty('hash')
        },
        err: error => {
          console.error('getRoute failed:', error.message)
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
      const slippageDecimal = getDefaultSlippageDecimalPercentageForSwapper(SwapperName.ButterSwap)
      const slippage = (Number(slippageDecimal) * 10000).toString()

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
          if (!isRouteSuccess(routeResponse)) {
            expect.fail(`Unexpected errno in ok branch: ${routeResponse.errno}`)
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
              if (!isBuildTxSuccess(buildTxResponse)) {
                expect.fail(`Unexpected errno in buildTxResponse: ${buildTxResponse.errno}`)
                return
              }
              // Only log if successful
              // eslint-disable-next-line no-console
              console.log(
                '[ButterSwap /swap] raw response:',
                JSON.stringify(buildTxResponse, null, 2),
              )
              expect(isBuildTxSuccess(buildTxResponse)).toBe(true)
            },
            err: error => {
              // Only fail if not a liquidity error
              if (!error.message.includes('Insufficient Liquidity')) {
                expect.fail(error.message)
              }
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
      const slippageDecimal = getDefaultSlippageDecimalPercentageForSwapper(SwapperName.ButterSwap)
      const slippage = (Number(slippageDecimal) * 10000).toString()
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
          console.error(error)
          expect.fail(error.message)
        },
      })
    })
  })
})

describe('ButterSwap ETH->USDC mainnet integration', () => {
  it('should get /route, /swap, and /routeAndSwap for 1 ETH -> USDC on mainnet', async () => {
    const fromChainId = 1
    const tokenInAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' // WETH
    const toChainId = 1
    const tokenOutAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' // USDC
    const amount = '1.0' // 1 ETH in human units
    const from = '0x348C4e6C9B3237A6c4226D654822BD969A72e841'
    const receiver = from
    const slippageDecimal = getDefaultSlippageDecimalPercentageForSwapper(SwapperName.ButterSwap)
    const slippage = (Number(slippageDecimal) * 10000).toString()

    // 1. Get route
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
        if (!isRouteSuccess(routeResponse)) {
          expect.fail(`Unexpected errno in ok branch: ${routeResponse.errno}`)
          return
        }
        const route = routeResponse.data[0]
        expect(route).toBeDefined()
        const hash = route.hash
        // 2. Get swap (buildTx)
        const buildTxResult = await getBuildTx(hash, slippage, from, receiver)
        buildTxResult.match({
          ok: buildTxResponse => {
            if (!isBuildTxSuccess(buildTxResponse)) {
              expect.fail(`Unexpected errno in buildTxResponse: ${buildTxResponse.errno}`)
              return
            }
            // Only log if successful
            // eslint-disable-next-line no-console
            console.log(
              '[ButterSwap /swap] raw response:',
              JSON.stringify(buildTxResponse, null, 2),
            )
            expect(isBuildTxSuccess(buildTxResponse)).toBe(true)
          },
          err: error => {
            // Only fail if not a liquidity error
            if (!error.message.includes('Insufficient Liquidity')) {
              expect.fail(error.message)
            }
          },
        })
        // 3. Get routeAndSwap
        const routeAndSwapResult = await getRouteAndSwap(
          fromChainId,
          tokenInAddress,
          toChainId,
          tokenOutAddress,
          amount,
          from,
          receiver,
          slippage,
        )
        routeAndSwapResult.match({
          ok: routeAndSwapResponse => {
            if (!isRouteAndSwapSuccess(routeAndSwapResponse)) {
              expect.fail(`Unexpected errno in routeAndSwapResponse: ${routeAndSwapResponse.errno}`)
              return
            }
            // Only log if successful
            // eslint-disable-next-line no-console
            console.log(
              '[ButterSwap /routeAndSwap] raw response:',
              JSON.stringify(routeAndSwapResponse, null, 2),
            )
            expect(isRouteAndSwapSuccess(routeAndSwapResponse)).toBe(true)
          },
          err: error => {
            if (!error.message.includes('Insufficient Liquidity')) {
              expect.fail(error.message)
            }
          },
        })
      },
      err: async error => {
        if (!error.message.includes('Insufficient Liquidity')) {
          expect.fail(error.message)
        }
        await Promise.resolve()
      },
    })
  })
})
