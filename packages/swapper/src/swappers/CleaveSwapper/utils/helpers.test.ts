import { fromAssetId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import { AxiosError } from 'axios'
import type { Address, Hex } from 'viem'
import { encodeFunctionData, zeroAddress } from 'viem'
import { describe, expect, it } from 'vitest'

import { makeSwapErrorRight } from '../../../utils'
import {
  ETH,
  FOX_GNOSIS,
  USDC_ARBITRUM,
  USDC_GNOSIS,
  USDC_MAINNET,
  WETH,
} from '../../../utils/test-data/assets'
import type { CleaveExecution, CleaveSwapQuote, CleaveTransaction } from '../types'
import { CLEAVE_CHAINS, CLEAVE_SWAP_SHELL_ABI } from './constants'
import {
  assertValidTrade,
  getCleaveRequestError,
  getCleaveRouteVenues,
  validateCleaveQuoteResponse,
} from './helpers'

const shell = CLEAVE_CHAINS[KnownChainIds.EthereumMainnet].swapShell
const unpinned: Address = '0x1111111111111111111111111111111111111111'
const recipient: Address = '0x00000000000000000000000000000000000000aa'
const treasury: Address = '0x00000000000000000000000000000000000000bb'
const deadline = 1_900_000_000

type SwapParams = {
  tokenIn: Address
  tokenOut: Address
  amountIn: bigint
  minAmountOut: bigint
  deadline: bigint
  recipient: Address
  referrer: Address
  referralFeeBps: number
  wethAsErc20: boolean
}

const swapParams: SwapParams = {
  tokenIn: fromAssetId(WETH.assetId).assetReference as Address,
  tokenOut: fromAssetId(USDC_MAINNET.assetId).assetReference as Address,
  amountIn: 1000n,
  minAmountOut: 985n,
  deadline: BigInt(deadline),
  recipient,
  referrer: zeroAddress,
  referralFeeBps: 0,
  wethAsErc20: true,
}

const encode = (overrides: Partial<SwapParams> = {}): Hex =>
  encodeFunctionData({
    abi: CLEAVE_SWAP_SHELL_ABI,
    functionName: 'swapWithBlob',
    args: [{ ...swapParams, ...overrides }, '0x01'],
  })

const tx: CleaveTransaction = { to: shell, data: encode(), value: '0' }
const execution: CleaveExecution = {
  target: shell,
  approval: { token: swapParams.tokenIn, spender: shell, amount: '1000' },
}

const quote: CleaveSwapQuote = {
  status: 'ok',
  kind: 'swap',
  amountIn: '1000',
  amountOutGross: '990',
  amountOutNet: '990',
  minOut: '985',
  fees: { referral: { bps: 0, amount: '0' } },
  partial: { refusedAtSource: '0' },
  route: { legs: [{ venueName: 'Uniswap V3' }] },
  preferredExecution: 'classic',
  execution,
  tx,
  notices: [],
}

const context: Parameters<typeof validateCleaveQuoteResponse>[1] = {
  chainId: KnownChainIds.EthereumMainnet,
  sellAsset: WETH,
  buyAsset: USDC_MAINNET,
  sellAmountCryptoBaseUnit: '1000',
  recipient,
  deadline,
  slippageBps: 50,
  referralBps: 0,
  referrer: zeroAddress,
}

const validate = (overrides: Partial<CleaveSwapQuote>, contextOverrides = {}) =>
  validateCleaveQuoteResponse({ ...quote, ...overrides }, { ...context, ...contextOverrides })

describe('assertValidTrade', () => {
  it('accepts a same-chain swap on a supported chain', () => {
    const result = assertValidTrade({ sellAsset: WETH, buyAsset: USDC_MAINNET, affiliateBps: '60' })
    expect(result.unwrap()).toBe(KnownChainIds.EthereumMainnet)
  })

  it.each([
    ['a cross-chain trade', { sellAsset: WETH, buyAsset: USDC_ARBITRUM }, 'CrossChainNotSupported'],
    ['an unsupported chain', { sellAsset: FOX_GNOSIS, buyAsset: USDC_GNOSIS }, 'UnsupportedChain'],
    ['a native wrap', { sellAsset: ETH, buyAsset: WETH }, 'UnsupportedTradePair'],
    ['a native unwrap', { sellAsset: WETH, buyAsset: ETH }, 'UnsupportedTradePair'],
  ])('rejects %s', (_label, assets, code) => {
    expect(assertValidTrade({ ...assets, affiliateBps: '0' }).unwrapErr().code).toBe(code)
  })

  it('rejects an affiliate fee above the referral cap', () => {
    const result = assertValidTrade({
      sellAsset: WETH,
      buyAsset: USDC_MAINNET,
      affiliateBps: '101',
    })
    expect(result.unwrapErr().code).toBe('UnsupportedTradePair')
  })
})

describe('validateCleaveQuoteResponse', () => {
  it('accepts a quote that matches the request', () => {
    expect(validate({}).isOk()).toBe(true)
  })

  it('skips null notice entries', () => {
    const warning = { code: 'price_impact', level: 'warning' as const, title: 'Impact', text: 'Hi' }
    expect(validate({ notices: [null, warning] }).isOk()).toBe(true)
  })

  it.each([
    ['an unpinned transaction target', { tx: { ...tx, to: unpinned } }],
    ['an unpinned execution target', { execution: { ...execution, target: unpinned } }],
    [
      'an unpinned approval spender',
      {
        execution: {
          ...execution,
          approval: { token: swapParams.tokenIn, spender: unpinned, amount: '1000' },
        },
      },
    ],
    ['native value on a token sell', { tx: { ...tx, value: '1' } }],
    ['calldata that is not a swap shell call', { tx: { ...tx, data: '0x12345678' as Hex } }],
    ['a different recipient', { tx: { ...tx, data: encode({ recipient: unpinned }) } }],
    ['a different sell amount', { tx: { ...tx, data: encode({ amountIn: 999n }) } }],
    ['a different buy token', { tx: { ...tx, data: encode({ tokenOut: unpinned }) } }],
    ['a different deadline', { tx: { ...tx, data: encode({ deadline: 1n }) } }],
    ['an unrequested referral', { tx: { ...tx, data: encode({ referralFeeBps: 10 }) } }],
    [
      'an output floor looser than the slippage',
      { tx: { ...tx, data: encode({ minAmountOut: 984n }) } },
    ],
    [
      'a malformed net amount',
      { amountOutNet: 'NaN', tx: { ...tx, data: encode({ minAmountOut: 0n }) } },
    ],
    ['a zero net amount', { amountOutNet: '0', tx: { ...tx, data: encode({ minAmountOut: 0n }) } }],
    ['a malformed gross amount', { amountOutGross: '9.9e2' }],
    ['a malformed transaction value', { tx: { ...tx, value: '0x0' } }],
    ['a referral bps we did not request', { fees: { referral: { bps: 10, amount: '0' } } }],
    ['a referral amount we did not request', { fees: { referral: { bps: 0, amount: '1' } } }],
  ])('rejects %s', (_label, overrides) => {
    expect(validate(overrides).unwrapErr().code).toBe('InvalidResponse')
  })

  describe('with a referral', () => {
    const feeContext = { referralBps: 60, referrer: treasury }
    const feeQuote = {
      amountOutNet: '985',
      fees: { referral: { bps: 60, amount: '5' } },
      tx: { ...tx, data: encode({ referrer: treasury, referralFeeBps: 60 }) },
    }

    it('accepts the requested referral paid to the treasury', () => {
      expect(validate(feeQuote, feeContext).isOk()).toBe(true)
    })

    it.each([
      [
        'a different referrer',
        { tx: { ...tx, data: encode({ referrer: unpinned, referralFeeBps: 60 }) } },
      ],
      ['a referral amount off the gross output', { fees: { referral: { bps: 60, amount: '6' } } }],
      ['a different referral bps', { fees: { referral: { bps: 50, amount: '4' } } }],
    ])('rejects %s', (_label, overrides) => {
      expect(validate({ ...feeQuote, ...overrides }, feeContext).unwrapErr().code).toBe(
        'InvalidResponse',
      )
    })
  })

  it('binds native value and the wrapped token to a native sell', () => {
    const nativeContext = { sellAsset: ETH }
    const nativeData = encode({ wethAsErc20: false })
    const nativeQuote = { execution: { target: shell, approval: null } }

    expect(
      validate(
        { ...nativeQuote, tx: { to: shell, data: nativeData, value: '1000' } },
        nativeContext,
      ).isOk(),
    ).toBe(true)
    expect(
      validate(
        { ...nativeQuote, tx: { to: shell, data: nativeData, value: '0' } },
        nativeContext,
      ).isErr(),
    ).toBe(true)
    expect(
      validate(
        { ...nativeQuote, tx: { to: shell, data: encode(), value: '1000' } },
        nativeContext,
      ).isErr(),
    ).toBe(true)
  })

  it('maps no_route to NoRouteFound', () => {
    const result = validateCleaveQuoteResponse({ status: 'no_route' }, context)
    expect(result.unwrapErr().code).toBe('NoRouteFound')
  })

  it.each([
    ['refused input', { partial: { refusedAtSource: '1' } }],
    ['hub remainders', { remainders: [{ token: unpinned }] }],
  ])('rejects a partial fill with %s', (_label, overrides) => {
    expect(validate(overrides).unwrapErr().code).toBe('NoRouteFound')
  })

  it('rejects measured-only execution', () => {
    const result = validate({ preferredExecution: 'measured', execution: null, tx: null })
    expect(result.unwrapErr().code).toBe('UnsupportedTradePair')
  })

  it('rejects a blocking notice even with a transaction', () => {
    const notice = {
      code: 'blocked',
      level: 'blocking' as const,
      title: 'Blocked',
      text: 'Do not sign',
    }
    const result = validate({ notices: [notice] })
    expect(result.unwrapErr().message).toBe('Do not sign')
  })
})

describe('getCleaveRouteVenues', () => {
  it('lists each named venue once', () => {
    const legs = [
      { venueName: 'Uniswap V3' },
      { venueName: 'unknown' },
      { venueName: 'Aerodrome' },
      { venueName: 'Uniswap V3' },
    ]
    expect(getCleaveRouteVenues({ legs })).toEqual(['Uniswap V3', 'Aerodrome'])
  })
})

describe('getCleaveRequestError', () => {
  const axiosError = (status: number, data: unknown) =>
    makeSwapErrorRight({
      message: 'request failed',
      cause: Object.assign(new AxiosError('request failed'), { response: { status, data } }),
    })

  it('maps a request timeout to Timeout', () => {
    const timeout = makeSwapErrorRight({
      message: 'request failed',
      cause: new AxiosError('timeout of 10000ms exceeded', 'ECONNABORTED'),
    })
    expect(getCleaveRequestError(timeout).code).toBe('Timeout')
  })

  it('maps a rate limit to RateLimitExceeded', () => {
    expect(getCleaveRequestError(axiosError(429, '')).code).toBe('RateLimitExceeded')
  })

  it('keeps the Cleave error message and maps its code', () => {
    const error = getCleaveRequestError(
      axiosError(400, {
        error: { code: 'unsupported_chain', message: 'Chain not enabled', retryable: false },
      }),
    )

    expect(error.code).toBe('UnsupportedChain')
    expect(error.message).toBe('Cleave quote failed: Chain not enabled')
  })

  it('falls back to QueryFailed for an unknown body', () => {
    expect(getCleaveRequestError(axiosError(502, 'Bad Gateway')).code).toBe('QueryFailed')
  })
})
