import type { Asset } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { AxiosError } from 'axios'
import { describe, expect, it } from 'vitest'

import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { ETH } from '../../../utils/test-data/assets'
import type {
  KyberBuildResponse,
  KyberExtraFee,
  KyberFeeParams,
  KyberRoutesResponse,
  KyberRouteSummary,
} from '../types'
import { KYBER_NATIVE_TOKEN, KYBER_ROUTER_ADDRESS } from './constants'
import {
  assertValidTrade,
  assetIdToKyberToken,
  getKyberBuyAmountBeforeFees,
  getKyberFeeParams,
  getKyberRequestError,
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
const USDC_HYPEREVM_TOKEN = '0xb88339CB7199b77E23DB6E890353E22632Ba630f'
const UNPINNED_ROUTER = '0x1111111111111111111111111111111111111111'
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

const ROUTE_SUMMARY = {
  amountOut: '255332541',
  gas: '679101',
  gasPrice: '100000000',
  extraFee: {
    feeAmount: '60',
    chargeFeeBy: 'currency_out',
    isInBps: true,
    feeReceiver: TREASURY.toLowerCase(),
  },
} as KyberRouteSummary

const ROUTES_RESPONSE: Required<KyberRoutesResponse> = {
  code: 0,
  message: 'successfully',
  data: { routeSummary: ROUTE_SUMMARY, routerAddress: KYBER_ROUTER_ADDRESS },
  requestId: 'route-request',
}

const BUILD_RESPONSE: Required<KyberBuildResponse> = {
  code: 0,
  message: 'successfully',
  data: {
    amountOut: '255332539',
    gas: '679101',
    data: '0xe21fd0e9',
    routerAddress: KYBER_ROUTER_ADDRESS,
    transactionValue: '3000000000000000000',
  },
  requestId: 'build-request',
}

describe('assertValidTrade', () => {
  it('rejects cross-chain trades', () => {
    const result = assertValidTrade({ sellAsset: HYPE, buyAsset: ETH })
    expect(result.unwrapErr().code).toBe(TradeQuoteError.CrossChainNotSupported)
  })

  it('rejects chains outside the chain map', () => {
    const XDAI = { ...ETH, chainId: KnownChainIds.GnosisMainnet, assetId: 'eip155:100/slip44:60' }
    const result = assertValidTrade({ sellAsset: XDAI, buyAsset: XDAI })
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
  const routeSummary = ROUTE_SUMMARY
  const validate = (
    summaryOverrides: Partial<typeof routeSummary>,
    dataOverrides = {},
    feeParams: KyberFeeParams | undefined = hyperEvmFeeParams,
  ) =>
    validateKyberRoute(
      {
        ...ROUTES_RESPONSE,
        data: {
          ...ROUTES_RESPONSE.data,
          routeSummary: { ...routeSummary, ...summaryOverrides },
          ...dataOverrides,
        },
      },
      feeParams,
    )

  it('returns the route summary', () => {
    expect(validateKyberRoute(ROUTES_RESPONSE, hyperEvmFeeParams).unwrap()).toBe(routeSummary)
  })

  it('rejects an unpinned router', () => {
    expect(validate({}, { routerAddress: UNPINNED_ROUTER }).unwrapErr().code).toBe(
      TradeQuoteError.InvalidResponse,
    )
  })

  it('rejects a route that dropped the requested fee', () => {
    expect(validate({ extraFee: EMPTY_EXTRA_FEE }).unwrapErr().code).toBe(
      TradeQuoteError.UnsupportedTradePair,
    )
  })

  it('accepts a fee-free route when no fee was requested', () => {
    expect(
      validateKyberRoute(
        {
          ...ROUTES_RESPONSE,
          data: {
            ...ROUTES_RESPONSE.data,
            routeSummary: { ...routeSummary, extraFee: EMPTY_EXTRA_FEE },
          },
        },
        undefined,
      ).isOk(),
    ).toBe(true)
  })

  it('maps a route not found code to NoRouteFound', () => {
    const result = validateKyberRoute(
      { ...ROUTES_RESPONSE, code: 4008, message: 'route not found' },
      hyperEvmFeeParams,
    )
    expect(result.unwrapErr().code).toBe(TradeQuoteError.NoRouteFound)
  })
})

describe('validateKyberBuild', () => {
  it('returns the build data', () => {
    expect(validateKyberBuild(BUILD_RESPONSE).unwrap()).toBe(BUILD_RESPONSE.data)
  })

  it('rejects an unpinned router', () => {
    const result = validateKyberBuild({
      ...BUILD_RESPONSE,
      data: { ...BUILD_RESPONSE.data, routerAddress: UNPINNED_ROUTER },
    })
    expect(result.unwrapErr().code).toBe(TradeQuoteError.InvalidResponse)
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
