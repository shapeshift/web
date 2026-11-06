import { KnownChainIds } from '@shapeshiftoss/types'
import { describe, expect, it } from 'vitest'

import { TradeQuoteError } from '../../../types'
import type {
  KyberBuildResponse,
  KyberExtraFee,
  KyberFeeParams,
  KyberRoutesResponse,
  KyberRouteSummary,
} from '../types'
import { KYBER_ROUTER_ADDRESS } from './constants'
import {
  getKyberBuyAmountBeforeFees,
  getKyberFeeParams,
  validateKyberBuild,
  validateKyberRoute,
} from './helpers'

const TREASURY = '0xF5AA59151bE6515C4Ca68A0282CF68B3eA4846fC'
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

const ROUTE = {
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
  data: { routeSummary: ROUTE, routerAddress: KYBER_ROUTER_ADDRESS },
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
  const validate = (
    summaryOverrides: Partial<typeof ROUTE>,
    dataOverrides = {},
    feeParams: KyberFeeParams | undefined = hyperEvmFeeParams,
  ) =>
    validateKyberRoute(
      {
        ...ROUTES_RESPONSE,
        data: {
          ...ROUTES_RESPONSE.data,
          routeSummary: { ...ROUTE, ...summaryOverrides },
          ...dataOverrides,
        },
      },
      feeParams,
    )

  it('returns the route summary', () => {
    expect(validateKyberRoute(ROUTES_RESPONSE, hyperEvmFeeParams).unwrap()).toBe(ROUTE)
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
            routeSummary: { ...ROUTE, extraFee: EMPTY_EXTRA_FEE },
          },
        },
        undefined,
      ).isOk(),
    ).toBe(true)
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
