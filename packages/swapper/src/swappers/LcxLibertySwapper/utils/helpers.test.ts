import { KnownChainIds } from '@shapeshiftoss/types'
import { AxiosError, AxiosHeaders } from 'axios'
import type { Address, Hex } from 'viem'
import { encodeFunctionData, getAddress, parseAbi, zeroAddress } from 'viem'
import { describe, expect, it } from 'vitest'

import { makeSwapErrorRight } from '../../../utils'
import {
  ETH,
  ETH_ARBITRUM,
  USDC_GNOSIS,
  USDC_MAINNET,
  WETH,
  XDAI,
} from '../../../utils/test-data/assets'
import type { LcxLibertyQuote, LcxLibertySwapTransaction } from '../types'
import { LCX_LIBERTY_ROUTER_ABI, LCX_LIBERTY_ROUTER_BY_CHAIN_ID } from './constants'
import {
  assertValidTrade,
  getLcxLibertyRequestError,
  getLcxLibertySlippageBps,
  validateLcxLibertyBuildResponse,
  validateLcxLibertyQuoteResponse,
} from './helpers'

const router = LCX_LIBERTY_ROUTER_BY_CHAIN_ID[KnownChainIds.EthereumMainnet]
const unpinnedRouter: Address = '0x1111111111111111111111111111111111111111'
const receiveAddress: Address = '0x2222222222222222222222222222222222222222'
const pool: Address = '0x3333333333333333333333333333333333333333'
const weth = getAddress('0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2')
const usdc = getAddress('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48')

type Leg = {
  amountIn: bigint
  hops: { family: number; pool: Address; tokenIn: Address; tokenOut: Address; aux: bigint }[]
}

type SwapArgs = {
  tokenIn: Address
  tokenOut: Address
  amountIn: bigint
  minAmountOut: bigint
  recipient: Address
  deadline: bigint
  legs: Leg[]
}

const makeLeg = (amountIn: bigint, hopPool: Address = pool): Leg => ({
  amountIn,
  hops: [{ family: 1, pool: hopPool, tokenIn: weth, tokenOut: usdc, aux: 3000n }],
})

// Entrypoints the router also exposes, which the swapper must never accept
const moduleAbi = parseAbi([
  'struct Hop { uint8 family; address pool; address tokenIn; address tokenOut; uint256 aux; }',
  'struct Leg { uint256 amountIn; Hop[] hops; }',
  'struct ModuleSwapArgs { address tokenIn; address tokenOut; uint256 amountIn; uint256 minAmountOut; address recipient; uint256 deadline; }',
  'struct MakerLeg { address target; address spender; uint256 amountIn; uint256 minOut; bytes data; }',
  'struct BookLeg { address market; uint256 amountIn; uint256 minOut; }',
  'function makerSwap(ModuleSwapArgs a, Leg[] poolLegs, MakerLeg m, Leg[] fallbackLegs) payable returns (uint256)',
  'function bookSwap(ModuleSwapArgs a, Leg[] poolLegs, BookLeg b, Leg[] fallbackLegs) payable returns (uint256)',
])

describe('getLcxLibertySlippageBps', () => {
  it.each([
    ['converts the default tolerance', '0.002', 20],
    ['rounds down so the tolerance never loosens', '0.00333', 33],
    ['caps at the 20% the api accepts', '0.3', 2000],
  ])('%s', (_label, slippageTolerancePercentageDecimal, bps) => {
    expect(getLcxLibertySlippageBps(slippageTolerancePercentageDecimal)).toBe(bps)
  })
})

describe('assertValidTrade', () => {
  it('accepts a same-chain trade on a supported chain', () => {
    expect(assertValidTrade({ sellAsset: WETH, buyAsset: USDC_MAINNET }).unwrap()).toBe(
      KnownChainIds.EthereumMainnet,
    )
  })

  it('rejects a cross-chain trade', () => {
    const result = assertValidTrade({ sellAsset: ETH, buyAsset: ETH_ARBITRUM })
    expect(result.unwrapErr().code).toBe('CrossChainNotSupported')
  })

  it('rejects a chain the router is not pinned on', () => {
    const result = assertValidTrade({ sellAsset: XDAI, buyAsset: USDC_GNOSIS })
    expect(result.unwrapErr().code).toBe('UnsupportedChain')
  })
})

describe('validateLcxLibertyQuoteResponse', () => {
  const quote: LcxLibertyQuote = {
    quoteId: 'q_0123456789abcdef0123456789abcdef',
    chainId: 1,
    input: { token: weth, amount: '1000000000000000000' },
    output: { token: usdc, amount: '2000000000', minimumAmount: '1996000000' },
    fee: { bps: 0, amount: '0' },
    gasEstimateWei: '32641663210000',
    slippageBps: 20,
    spender: router,
  }
  const context: Parameters<typeof validateLcxLibertyQuoteResponse>[1] = {
    chainId: KnownChainIds.EthereumMainnet,
    sellAsset: WETH,
    buyAsset: USDC_MAINNET,
    sellAmountCryptoBaseUnit: '1000000000000000000',
    slippageBps: 20,
  }
  const validate = (overrides: Partial<LcxLibertyQuote>) =>
    validateLcxLibertyQuoteResponse(
      { success: true, data: { quote: { ...quote, ...overrides } } },
      context,
    )

  it('accepts a quote that matches the request', () => {
    expect(validate({}).isOk()).toBe(true)
  })

  it.each([
    ['an unpinned spender', { spender: unpinnedRouter }],
    ['a missing spender', { spender: null }],
    ['a different chain', { chainId: 8453 }],
    ['a different sell token', { input: { ...quote.input, token: usdc } }],
    ['a different buy token', { output: { ...quote.output, token: weth } }],
    ['a different sell amount', { input: { ...quote.input, amount: '999' } }],
    ['a different slippage', { slippageBps: 50 }],
    ['a fee we did not request', { fee: { bps: 30, amount: '6000000' } }],
    [
      'an output floor looser than the slippage',
      { output: { ...quote.output, minimumAmount: '1995999999' } },
    ],
  ])('rejects %s', (_label, overrides) => {
    expect(validate(overrides).unwrapErr().code).toBe('InvalidResponse')
  })

  it('maps a zero output to NoRouteFound', () => {
    const result = validate({ output: { ...quote.output, amount: '0', minimumAmount: '0' } })
    expect(result.unwrapErr().code).toBe('NoRouteFound')
  })
})

describe('validateLcxLibertyBuildResponse', () => {
  const nowSeconds = 1_900_000_000
  const swapDeadline = BigInt(nowSeconds + 900)
  const moduleHead = {
    tokenIn: weth,
    tokenOut: usdc,
    amountIn: 1000n,
    minAmountOut: 996n,
    recipient: receiveAddress,
    deadline: swapDeadline,
  }
  const swapArgs: SwapArgs = { ...moduleHead, legs: [makeLeg(1000n)] }
  const swapSplit = (overrides: Partial<SwapArgs> = {}): Hex => {
    const { tokenIn, tokenOut, amountIn, minAmountOut, recipient, deadline, legs } = {
      ...swapArgs,
      ...overrides,
    }
    return encodeFunctionData({
      abi: LCX_LIBERTY_ROUTER_ABI,
      functionName: 'swapSplit',
      args: [tokenIn, tokenOut, amountIn, minAmountOut, recipient, deadline, legs],
    })
  }
  const transaction: LcxLibertySwapTransaction = {
    chainId: 1,
    to: router,
    data: swapSplit(),
    value: '0',
    gas: '250000',
  }
  const context: Parameters<typeof validateLcxLibertyBuildResponse>[1] = {
    chainId: KnownChainIds.EthereumMainnet,
    sellAsset: WETH,
    buyAsset: USDC_MAINNET,
    sellAmountCryptoBaseUnit: '1000',
    receiveAddress,
    minimumBuyAmountCryptoBaseUnit: '996',
    nowSeconds,
  }
  const validate = (overrides: Partial<LcxLibertySwapTransaction>, contextOverrides = {}) =>
    validateLcxLibertyBuildResponse(
      { success: true, data: { swap: { ...transaction, ...overrides } } },
      { ...context, ...contextOverrides },
    )

  it('accepts a swap that matches the quote and reads its deadline', () => {
    expect(validate({}).unwrap().deadlineSeconds).toBe(Number(swapDeadline))
  })

  it('accepts a higher floor than quoted', () => {
    expect(validate({ data: swapSplit({ minAmountOut: 999n }) }).isOk()).toBe(true)
  })

  it('accepts a split whose legs spend the sell amount', () => {
    const legs = [makeLeg(600n), makeLeg(400n)]
    expect(validate({ data: swapSplit({ legs }) }).isOk()).toBe(true)
  })

  it.each([
    ['an unpinned router', { to: unpinnedRouter }],
    ['a different chain', { chainId: 8453 }],
    ['native value on a token sell', { value: '1' }],
    ['an unknown entrypoint', { data: '0x12345678' as Hex }],
    ['a different recipient', { data: swapSplit({ recipient: unpinnedRouter }) }],
    ['a floor below the quoted minimum', { data: swapSplit({ minAmountOut: 995n }) }],
    ['a different sell amount', { data: swapSplit({ amountIn: 1001n }) }],
    ['a different pair', { data: swapSplit({ tokenOut: weth }) }],
    ['a passed deadline', { data: swapSplit({ deadline: BigInt(nowSeconds) }) }],
    [
      'legs that spend more than the sell amount',
      { data: swapSplit({ legs: [makeLeg(600n), makeLeg(401n)] }) },
    ],
    ['a hop that calls the sold token', { data: swapSplit({ legs: [makeLeg(1000n, weth)] }) }],
    ['a hop that calls the bought token', { data: swapSplit({ legs: [makeLeg(1000n, usdc)] }) }],
    ['a hop that calls the router', { data: swapSplit({ legs: [makeLeg(1000n, router)] }) }],
    [
      'a maker swap',
      {
        data: encodeFunctionData({
          abi: moduleAbi,
          functionName: 'makerSwap',
          args: [
            moduleHead,
            [makeLeg(600n)],
            { target: pool, spender: pool, amountIn: 400n, minOut: 1n, data: '0x' },
            [makeLeg(400n)],
          ],
        }),
      },
    ],
    [
      'an order book swap',
      {
        data: encodeFunctionData({
          abi: moduleAbi,
          functionName: 'bookSwap',
          args: [
            moduleHead,
            [makeLeg(600n)],
            { market: pool, amountIn: 400n, minOut: 1n },
            [makeLeg(400n)],
          ],
        }),
      },
    ],
  ])('rejects %s', (_label, overrides) => {
    expect(validate(overrides).unwrapErr().code).toBe('InvalidResponse')
  })

  it('rejects a build without a transaction', () => {
    const result = validateLcxLibertyBuildResponse({ success: true, data: { swap: null } }, context)
    expect(result.unwrapErr().code).toBe('InvalidResponse')
  })

  it('binds native transaction value and the native sentinel to a native sell', () => {
    const nativeContext = { sellAsset: ETH }
    const nativeData = swapSplit({ tokenIn: zeroAddress })

    expect(validate({ data: nativeData }, nativeContext).isErr()).toBe(true)
    expect(validate({ value: '1000' }, nativeContext).isErr()).toBe(true)
    expect(validate({ data: nativeData, value: '1000' }, nativeContext).isOk()).toBe(true)
  })
})

describe('getLcxLibertyRequestError', () => {
  const requestError = (status: number, data: unknown) =>
    makeSwapErrorRight({
      message: 'makeSwapperAxiosServiceMonadic',
      cause: new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
        status,
        statusText: '',
        data,
        headers: {},
        config: { headers: new AxiosHeaders() },
      }),
    })

  it.each([
    [
      'a rate limit',
      429,
      { success: false, code: 'RATE_LIMITED', message: 'slow down' },
      'RateLimitExceeded',
    ],
    ['no route', 422, { success: false, code: 'no_route', message: 'no path' }, 'NoRouteFound'],
    [
      'thin liquidity',
      422,
      { success: false, code: 'insufficient_liquidity', message: 'too large' },
      'NoRouteFound',
    ],
    [
      'an unknown chain',
      400,
      { success: false, code: 'unknown_chain', message: '' },
      'UnsupportedChain',
    ],
    [
      'an expired quote',
      410,
      { success: false, code: 'QUOTE_EXPIRED', message: '' },
      'QueryFailed',
    ],
    ['a body without a code', 502, 'Bad Gateway', 'QueryFailed'],
  ])('maps %s', (_label, status, data, code) => {
    expect(getLcxLibertyRequestError(requestError(status, data)).code).toBe(code)
  })
})
