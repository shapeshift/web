import type { Asset } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { AxiosError } from 'axios'
import type { Hex } from 'viem'
import { decodeFunctionData, encodeFunctionData } from 'viem'
import { describe, expect, it } from 'vitest'

import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { ETH, USDC_MAINNET } from '../../../utils/test-data/assets'
import { HYPEREVM_BUILD_RESPONSE, HYPEREVM_ROUTES_RESPONSE } from '../test-data/hyperevmHypeUsdc'
import { MONAD_BUILD_RESPONSE } from '../test-data/monadUsdcMon'
import type { KyberExtraFee } from '../types'
import { KYBER_NATIVE_TOKEN, KYBER_ROUTER_ABI } from './constants'
import {
  assertValidTrade,
  assetIdToKyberToken,
  getKyberBuyAmountBeforeFees,
  getKyberFeeParams,
  getKyberRequestError,
  getKyberSlippageBps,
  validateKyberBuild,
  validateKyberRoute,
} from './helpers'

const HYPE: Asset = {
  ...ETH,
  assetId: 'eip155:999/slip44:60',
  chainId: KnownChainIds.HyperEvmMainnet,
  symbol: 'HYPE',
  name: 'HYPE',
  precision: 18,
}

const USDC_HYPEREVM: Asset = {
  ...ETH,
  assetId: 'eip155:999/erc20:0xb88339cb7199b77e23db6e890353e22632ba630f',
  chainId: KnownChainIds.HyperEvmMainnet,
  symbol: 'USDC',
  name: 'USDC',
  precision: 6,
}

const TREASURY = '0xF5AA59151bE6515C4Ca68A0282CF68B3eA4846fC'
const RECIPIENT = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
const USDC_HYPEREVM_TOKEN = '0xb88339CB7199b77E23DB6E890353E22632Ba630f'
const USDC_MONAD_TOKEN = '0x754704Bc059F8C67012fEd69BC8A327a5aafb603'
const EMPTY_EXTRA_FEE: KyberExtraFee = {
  feeAmount: '',
  chargeFeeBy: '',
  isInBps: false,
  feeReceiver: '',
}

const hyperEvmFeeParams = getKyberFeeParams({
  chainId: KnownChainIds.HyperEvmMainnet,
  affiliateBps: '60',
})

describe('assertValidTrade', () => {
  it('rejects cross-chain trades', () => {
    const result = assertValidTrade({ sellAsset: HYPE, buyAsset: ETH })
    expect(result.unwrapErr().code).toBe(TradeQuoteError.CrossChainNotSupported)
  })

  it('rejects chains outside the chain map', () => {
    const result = assertValidTrade({ sellAsset: ETH, buyAsset: USDC_MAINNET })
    expect(result.unwrapErr().code).toBe(TradeQuoteError.UnsupportedChain)
  })

  it('returns the chain id for a supported same-chain trade', () => {
    const result = assertValidTrade({ sellAsset: HYPE, buyAsset: USDC_HYPEREVM })
    expect(result.unwrap()).toBe(KnownChainIds.HyperEvmMainnet)
  })
})

describe('assetIdToKyberToken', () => {
  it('maps the native asset to the native marker', () => {
    expect(assetIdToKyberToken(HYPE.assetId)).toBe(KYBER_NATIVE_TOKEN)
  })

  it('checksums token addresses', () => {
    expect(assetIdToKyberToken(USDC_HYPEREVM.assetId)).toBe(USDC_HYPEREVM_TOKEN)
  })
})

describe('getKyberFeeParams', () => {
  it('sends no fee for a fee-free swap', () => {
    expect(
      getKyberFeeParams({ chainId: KnownChainIds.HyperEvmMainnet, affiliateBps: '0' }),
    ).toBeUndefined()
  })

  it('charges the output in bps to the chain treasury', () => {
    expect(hyperEvmFeeParams).toEqual({
      feeAmount: '60',
      chargeFeeBy: 'currency_out',
      isInBps: true,
      feeReceiver: TREASURY,
    })
  })
})

describe('getKyberSlippageBps', () => {
  it.each([
    ['0.002', 20],
    ['0.00005', 0.5],
  ])('converts %s to %s bps', (slippage, bps) => {
    expect(getKyberSlippageBps(slippage)).toBe(bps)
  })
})

describe('getKyberBuyAmountBeforeFees', () => {
  it.each([
    ['255332541', '60', '256873783'],
    ['54334339666759063267443', '60', '54662313548047347351552'],
    ['123', '0', '123'],
  ])('grosses up %s at %s bps to %s', (buyAmountAfterFeesCryptoBaseUnit, affiliateBps, gross) => {
    expect(getKyberBuyAmountBeforeFees({ buyAmountAfterFeesCryptoBaseUnit, affiliateBps })).toBe(
      gross,
    )
  })
})

describe('validateKyberRoute', () => {
  const { routeSummary } = HYPEREVM_ROUTES_RESPONSE.data
  const context: Parameters<typeof validateKyberRoute>[1] = {
    tokenIn: KYBER_NATIVE_TOKEN,
    tokenOut: USDC_HYPEREVM_TOKEN,
    sellAmountCryptoBaseUnit: '3000000000000000000',
    feeParams: hyperEvmFeeParams,
  }
  const validate = (
    summaryOverrides: Partial<typeof routeSummary>,
    dataOverrides = {},
    contextOverrides = {},
  ) =>
    validateKyberRoute(
      {
        ...HYPEREVM_ROUTES_RESPONSE,
        data: {
          ...HYPEREVM_ROUTES_RESPONSE.data,
          routeSummary: { ...routeSummary, ...summaryOverrides },
          ...dataOverrides,
        },
      },
      { ...context, ...contextOverrides },
    )

  it('accepts the route we requested', () => {
    expect(validateKyberRoute(HYPEREVM_ROUTES_RESPONSE, context).unwrap()).toBe(
      HYPEREVM_ROUTES_RESPONSE.data,
    )
  })

  it.each([
    ['an unpinned router', {}, { routerAddress: '0x1111111111111111111111111111111111111111' }],
    ['a different sell amount', { amountIn: '2999999999999999999' }, {}],
    ['a different buy token', { tokenOut: '0x5555555555555555555555555555555555555555' }, {}],
    [
      'a different fee receiver',
      {
        extraFee: {
          ...routeSummary.extraFee,
          feeReceiver: '0x2222222222222222222222222222222222222222',
        },
      },
      {},
    ],
    ['a different fee amount', { extraFee: { ...routeSummary.extraFee, feeAmount: '5' } }, {}],
  ])('rejects %s', (_label, summaryOverrides, dataOverrides) => {
    expect(validate(summaryOverrides, dataOverrides).unwrapErr().code).toBe(
      TradeQuoteError.InvalidResponse,
    )
  })

  it('rejects a fee we did not request', () => {
    expect(validate({}, {}, { feeParams: undefined }).unwrapErr().code).toBe(
      TradeQuoteError.InvalidResponse,
    )
  })

  it('rejects a route that dropped the requested fee', () => {
    expect(validate({ extraFee: EMPTY_EXTRA_FEE }).unwrapErr().code).toBe(
      TradeQuoteError.UnsupportedTradePair,
    )
  })

  it('accepts a fee-free route when no fee was requested', () => {
    expect(validate({ extraFee: EMPTY_EXTRA_FEE }, {}, { feeParams: undefined }).isOk()).toBe(true)
  })

  it('maps a route not found code to NoRouteFound', () => {
    const result = validateKyberRoute(
      { ...HYPEREVM_ROUTES_RESPONSE, code: 4008, message: 'route not found' },
      context,
    )
    expect(result.unwrapErr().code).toBe(TradeQuoteError.NoRouteFound)
  })
})

describe('validateKyberBuild', () => {
  const build = HYPEREVM_BUILD_RESPONSE.data
  const [execution] = decodeFunctionData({ abi: KYBER_ROUTER_ABI, data: build.data }).args
  const context: Parameters<typeof validateKyberBuild>[1] = {
    tokenIn: KYBER_NATIVE_TOKEN,
    tokenOut: USDC_HYPEREVM_TOKEN,
    sellAmountCryptoBaseUnit: '3000000000000000000',
    feeParams: hyperEvmFeeParams,
    recipient: RECIPIENT,
    slippageTolerancePercentageDecimal: '0.002',
  }
  const validate = (buildOverrides: Partial<typeof build>, contextOverrides = {}) =>
    validateKyberBuild(
      { ...HYPEREVM_BUILD_RESPONSE, data: { ...build, ...buildOverrides } },
      { ...context, ...contextOverrides },
    )
  const encodeWithDesc = (descOverrides: Partial<typeof execution.desc>): Hex =>
    encodeFunctionData({
      abi: KYBER_ROUTER_ABI,
      functionName: 'swap',
      args: [{ ...execution, desc: { ...execution.desc, ...descOverrides } }],
    })

  it('re-encodes the untouched calldata byte for byte', () => {
    expect(encodeWithDesc({})).toBe(build.data)
  })

  it('accepts the transaction we requested', () => {
    expect(validateKyberBuild(HYPEREVM_BUILD_RESPONSE, context).unwrap()).toBe(build)
  })

  it.each([
    ['a different recipient', { dstReceiver: '0x2222222222222222222222222222222222222222' }],
    ['a different fee receiver', { feeReceivers: ['0x3333333333333333333333333333333333333333'] }],
    ['a different fee amount', { feeAmounts: [5n] }],
    ['a removed fee', { feeReceivers: [], feeAmounts: [], flags: 0x200n }],
    ['an output floor one unit under the slippage', { minReturnAmount: 254821872n }],
    ['a different sell amount', { amount: 1n }],
  ] as const)('rejects calldata with %s', (_label, descOverrides) => {
    expect(validate({ data: encodeWithDesc(descOverrides) }).unwrapErr().code).toBe(
      TradeQuoteError.InvalidResponse,
    )
  })

  it.each([
    ['an unpinned router', { routerAddress: '0x1111111111111111111111111111111111111111' }],
    ['no native value on a native sell', { transactionValue: '0' }],
    ['undecodable calldata', { data: '0xdeadbeef' }],
  ] as const)('rejects %s', (_label, buildOverrides) => {
    expect(validate(buildOverrides).unwrapErr().code).toBe(TradeQuoteError.InvalidResponse)
  })

  it('rejects an output floor looser than the requested slippage', () => {
    expect(validate({}, { slippageTolerancePercentageDecimal: '0.001' }).unwrapErr().code).toBe(
      TradeQuoteError.InvalidResponse,
    )
  })

  describe('token sell to native', () => {
    const monadContext: Parameters<typeof validateKyberBuild>[1] = {
      tokenIn: USDC_MONAD_TOKEN,
      tokenOut: KYBER_NATIVE_TOKEN,
      sellAmountCryptoBaseUnit: '1000000000',
      feeParams: getKyberFeeParams({ chainId: KnownChainIds.MonadMainnet, affiliateBps: '60' }),
      recipient: RECIPIENT,
      slippageTolerancePercentageDecimal: '0.002',
    }

    it('accepts a zero transaction value', () => {
      expect(validateKyberBuild(MONAD_BUILD_RESPONSE, monadContext).isOk()).toBe(true)
    })

    it('rejects a native transaction value', () => {
      const result = validateKyberBuild(
        {
          ...MONAD_BUILD_RESPONSE,
          data: { ...MONAD_BUILD_RESPONSE.data, transactionValue: '1000000000' },
        },
        monadContext,
      )
      expect(result.unwrapErr().code).toBe(TradeQuoteError.InvalidResponse)
    })
  })
})

describe('getKyberRequestError', () => {
  const requestError = (status: number, data: unknown) =>
    getKyberRequestError(
      makeSwapErrorRight({
        message: 'x',
        cause: Object.assign(new AxiosError('failed'), { response: { status, data } }),
      }),
    )

  it.each([
    [429, { message: 'Forbidden', status: 429 }, TradeQuoteError.RateLimitExceeded],
    [404, { message: '', status: 404 }, TradeQuoteError.UnsupportedChain],
    [400, { code: 4011, message: 'token not found' }, TradeQuoteError.UnsupportedTradePair],
    [400, { code: 4008, message: 'route not found' }, TradeQuoteError.NoRouteFound],
    [
      400,
      { code: 4009, message: 'amountIn is greater than max allowed' },
      TradeQuoteError.NoRouteFound,
    ],
    [
      400,
      { code: 4007, message: 'feeAmount is greater than amountOut' },
      TradeQuoteError.SellAmountBelowTradeFee,
    ],
    [400, { code: 4000, message: 'bad request' }, TradeQuoteError.QueryFailed],
  ])('maps HTTP %s with %j to the right error', (status, data, code) => {
    expect(requestError(status, { ...data, details: null, requestId: 'x' }).code).toBe(code)
  })

  it('keeps the Kyber code and request id for support', () => {
    expect(
      requestError(400, { code: 4008, message: 'route not found', requestId: 'abc' }).details,
    ).toEqual({ code: 4008, requestId: 'abc' })
  })

  it('returns a non-axios error unchanged', () => {
    const error = makeSwapErrorRight({ message: 'x', cause: new Error('boom') })
    expect(getKyberRequestError(error)).toBe(error)
  })
})
