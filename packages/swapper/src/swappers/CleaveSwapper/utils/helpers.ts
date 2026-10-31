import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { BigNumber, bn } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import axios from 'axios'
import type { Address } from 'viem'
import { decodeFunctionData, getAddress } from 'viem'

import type { SwapErrorRight } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { isNativeEvmAsset } from '../../../utils/helpers'
import type {
  CleaveErrorResponse,
  CleaveExecutableQuote,
  CleaveQuoteResponse,
  CleaveSwapQuote,
} from '../types'
import type { CleaveSupportedChainId } from './constants'
import {
  CLEAVE_CHAINS,
  CLEAVE_MAX_REFERRAL_BPS,
  CLEAVE_NATIVE_TOKEN,
  CLEAVE_SWAP_SHELL_ABI,
} from './constants'

const isCleaveSupportedChainId = (chainId: ChainId): chainId is CleaveSupportedChainId =>
  chainId in CLEAVE_CHAINS

const isSameAddress = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase()

export const convertAssetIdToCleaveToken = (assetId: AssetId): Address => {
  if (isNativeEvmAsset(assetId)) return CLEAVE_NATIVE_TOKEN

  return getAddress(fromAssetId(assetId).assetReference)
}

const getSwapShellToken = (asset: Asset, chainId: CleaveSupportedChainId): string =>
  isNativeEvmAsset(asset.assetId)
    ? CLEAVE_CHAINS[chainId].wrappedNative
    : fromAssetId(asset.assetId).assetReference

export const getCleaveRouteVenues = (route: CleaveSwapQuote['route']): string[] => [
  ...new Set(
    (route?.legs ?? []).map(leg => leg.venueName).filter(venueName => venueName !== 'unknown'),
  ),
]

export const assertValidTrade = ({
  sellAsset,
  buyAsset,
  affiliateBps,
}: {
  sellAsset: Asset
  buyAsset: Asset
  affiliateBps: string
}): Result<CleaveSupportedChainId, SwapErrorRight> => {
  if (sellAsset.chainId !== buyAsset.chainId) {
    return Err<CleaveSupportedChainId, SwapErrorRight>(
      makeSwapErrorRight({
        message: 'Cleave does not support cross-chain trades',
        code: TradeQuoteError.CrossChainNotSupported,
      }),
    )
  }

  const { chainId } = sellAsset

  if (!isCleaveSupportedChainId(chainId)) {
    return Err<CleaveSupportedChainId, SwapErrorRight>(
      makeSwapErrorRight({
        message: 'Cleave only supports configured EVM chains',
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  if (isSameAddress(getSwapShellToken(sellAsset, chainId), getSwapShellToken(buyAsset, chainId))) {
    return Err<CleaveSupportedChainId, SwapErrorRight>(
      makeSwapErrorRight({
        message: 'Cleave does not wrap or unwrap the native asset',
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )
  }

  if (bn(affiliateBps).gt(CLEAVE_MAX_REFERRAL_BPS)) {
    return Err<CleaveSupportedChainId, SwapErrorRight>(
      makeSwapErrorRight({
        message: `Cleave caps the affiliate fee at ${CLEAVE_MAX_REFERRAL_BPS} bps`,
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )
  }

  return Ok<CleaveSupportedChainId, SwapErrorRight>(chainId)
}

const isCleaveErrorResponse = (value: unknown): value is CleaveErrorResponse =>
  typeof value === 'object' &&
  value !== null &&
  'error' in value &&
  typeof value.error === 'object' &&
  value.error !== null &&
  'code' in value.error &&
  typeof value.error.code === 'string' &&
  'message' in value.error &&
  typeof value.error.message === 'string'

const getCleaveErrorCode = (code: string): TradeQuoteError => {
  switch (code) {
    case 'unsupported_chain':
      return TradeQuoteError.UnsupportedChain
    case 'same_token':
      return TradeQuoteError.UnsupportedTradePair
    case 'rate_limited':
      return TradeQuoteError.RateLimitExceeded
    case 'upstream_timeout':
      return TradeQuoteError.Timeout
    default:
      return TradeQuoteError.QueryFailed
  }
}

export const getCleaveRequestError = (error: SwapErrorRight): SwapErrorRight => {
  const { cause } = error

  if (!axios.isAxiosError(cause)) return error

  if (cause.code === 'ECONNABORTED' && !cause.response) {
    return makeSwapErrorRight({
      message: 'Cleave request timed out',
      code: TradeQuoteError.Timeout,
    })
  }

  if (cause.response?.status === 429) {
    return makeSwapErrorRight({
      message: 'Cleave rate limit exceeded',
      code: TradeQuoteError.RateLimitExceeded,
    })
  }

  const body: unknown = cause.response?.data

  if (!isCleaveErrorResponse(body)) {
    return makeSwapErrorRight({
      message: `Cleave request failed with status ${cause.response?.status}`,
      code: TradeQuoteError.QueryFailed,
      cause,
    })
  }

  const { code, reason, message } = body.error

  return makeSwapErrorRight({
    message: `Cleave quote failed: ${message}`,
    details: { code, reason },
    code: getCleaveErrorCode(code),
  })
}

const invalidResponse = (message: string, details?: unknown): SwapErrorRight =>
  makeSwapErrorRight({ message, details, code: TradeQuoteError.InvalidResponse })

const isBaseUnitAmount = (value: unknown): value is string =>
  typeof value === 'string' && /^\d+$/.test(value)

type CleaveQuoteContext = {
  chainId: CleaveSupportedChainId
  sellAsset: Asset
  buyAsset: Asset
  sellAmountCryptoBaseUnit: string
  recipient: string
  deadline: number
  slippageBps: number
  referralBps: number
  referrer: string
}

const getQuoteError = (
  quote: CleaveExecutableQuote,
  {
    chainId,
    sellAsset,
    buyAsset,
    sellAmountCryptoBaseUnit,
    recipient,
    deadline,
    slippageBps,
    referralBps,
    referrer,
  }: CleaveQuoteContext,
): SwapErrorRight | undefined => {
  const { tx, execution, amountOutGross, amountOutNet, fees } = quote

  const amounts = {
    amountOutGross,
    amountOutNet,
    referralFee: fees?.referral?.amount,
    value: tx.value,
  }
  const malformed = Object.entries(amounts).find(([, amount]) => !isBaseUnitAmount(amount))

  if (malformed || bn(amountOutNet).isZero()) {
    return invalidResponse('Cleave quoted a malformed amount', amounts)
  }

  if ((quote.partial && !bn(quote.partial.refusedAtSource).isZero()) || quote.remainders?.length) {
    return makeSwapErrorRight({
      message: 'Cleave can only route part of the sell amount',
      code: TradeQuoteError.NoRouteFound,
    })
  }

  const expectedReferralFee = bn(amountOutGross)
    .times(referralBps)
    .div(10_000)
    .integerValue(BigNumber.ROUND_DOWN)

  if (fees.referral.bps !== referralBps || !bn(fees.referral.amount).eq(expectedReferralFee)) {
    return invalidResponse('Cleave referral does not match the requested affiliate fee', {
      referral: fees.referral,
      referralBps,
      expectedReferralFee: expectedReferralFee.toFixed(),
    })
  }

  const { swapShell } = CLEAVE_CHAINS[chainId]

  if (!isSameAddress(tx.to, swapShell) || !isSameAddress(execution.target, swapShell)) {
    return invalidResponse(
      `Cleave target ${tx.to} is not the pinned swap shell ${swapShell} for ${chainId}`,
    )
  }

  const isNativeSell = isNativeEvmAsset(sellAsset.assetId)

  if (!isNativeSell && !isSameAddress(execution.approval?.spender ?? '', swapShell)) {
    return invalidResponse('Cleave approval spender is not the pinned swap shell', {
      approval: execution.approval,
    })
  }

  const expectedValue = isNativeSell ? sellAmountCryptoBaseUnit : '0'
  if (!bn(tx.value).eq(expectedValue)) {
    return invalidResponse('Cleave transaction value does not match the sell amount', {
      value: tx.value,
      expectedValue,
    })
  }

  const decoded = (() => {
    try {
      return decodeFunctionData({ abi: CLEAVE_SWAP_SHELL_ABI, data: tx.data })
    } catch (error) {
      return undefined
    }
  })()

  if (!decoded) return invalidResponse('Cleave transaction is not a swap shell call')

  const [params] = decoded.args

  const expectedParams = {
    tokenIn: getSwapShellToken(sellAsset, chainId),
    tokenOut: getSwapShellToken(buyAsset, chainId),
    amountIn: sellAmountCryptoBaseUnit,
    deadline,
    recipient,
    referrer,
    referralFeeBps: referralBps,
    wethAsErc20: !isNativeSell && !isNativeEvmAsset(buyAsset.assetId),
  }

  const mismatch = (Object.keys(expectedParams) as (keyof typeof expectedParams)[]).find(
    key => String(params[key]).toLowerCase() !== String(expectedParams[key]).toLowerCase(),
  )

  if (mismatch) {
    return invalidResponse(`Cleave transaction ${mismatch} does not match the request`, {
      actual: String(params[mismatch]),
      expected: String(expectedParams[mismatch]),
    })
  }

  // The swap shell enforces minAmountOut, which may not be looser than the requested slippage
  const outputFloor = bn(amountOutNet)
    .times(10_000 - slippageBps)
    .div(10_000)
    .integerValue(BigNumber.ROUND_DOWN)

  if (bn(params.minAmountOut.toString()).lt(outputFloor)) {
    return invalidResponse('Cleave output floor is below the requested slippage', {
      minAmountOut: params.minAmountOut.toString(),
      outputFloor: outputFloor.toFixed(),
      slippageBps,
    })
  }
}

export const validateCleaveQuoteResponse = (
  response: CleaveQuoteResponse,
  context: CleaveQuoteContext,
): Result<CleaveExecutableQuote, SwapErrorRight> => {
  if (response?.status !== 'ok') {
    return Err(
      makeSwapErrorRight({
        message: 'Cleave found no route for this trade',
        details: response,
        code: TradeQuoteError.NoRouteFound,
      }),
    )
  }

  const blockingNotice = response.notices?.find(notice => notice.level === 'blocking')

  if (blockingNotice) {
    return Err(
      makeSwapErrorRight({
        message: blockingNotice.text,
        details: { code: blockingNotice.code },
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )
  }

  const { tx, execution } = response

  if (response.preferredExecution !== 'classic' || !tx || !execution) {
    return Err(
      makeSwapErrorRight({
        message: 'Cleave has no classic swap transaction for this trade',
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )
  }

  const quote: CleaveExecutableQuote = { ...response, tx, execution }
  const error = getQuoteError(quote, context)

  return error ? Err(error) : Ok(quote)
}
