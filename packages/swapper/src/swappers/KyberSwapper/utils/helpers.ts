import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import {
  BigNumber,
  bn,
  bnOrZero,
  convertDecimalPercentageToBasisPoints,
} from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import axios from 'axios'
import type { Address, Hex } from 'viem'
import { decodeFunctionData, getAddress } from 'viem'

import type { SwapErrorRight } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight, makeTradeStepBuildFailedErr } from '../../../utils'
import { getTreasuryAddressFromChainId, isNativeEvmAsset } from '../../../utils/helpers'
import type {
  KyberBuildData,
  KyberBuildResponse,
  KyberErrorResponse,
  KyberExtraFee,
  KyberFeeParams,
  KyberRouteData,
  KyberRoutesResponse,
} from '../types'
import type { KyberSupportedChainId } from './constants'
import {
  KYBER_CHAINS,
  KYBER_FEE_FLAGS,
  KYBER_NATIVE_TOKEN,
  KYBER_ROUTER_ABI,
  KYBER_ROUTER_ADDRESS,
} from './constants'

const isKyberSupportedChainId = (chainId: ChainId): chainId is KyberSupportedChainId =>
  chainId in KYBER_CHAINS

const isSameAddress = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase()

const invalidResponse = (message: string, details?: unknown): SwapErrorRight =>
  makeSwapErrorRight({ message, details, code: TradeQuoteError.InvalidResponse })

export const assertValidTrade = ({
  sellAsset,
  buyAsset,
}: {
  sellAsset: Asset
  buyAsset: Asset
}): Result<KyberSupportedChainId, SwapErrorRight> => {
  if (sellAsset.chainId !== buyAsset.chainId) {
    return Err<KyberSupportedChainId, SwapErrorRight>(
      makeSwapErrorRight({
        message: 'KyberSwap does not support cross-chain trades',
        code: TradeQuoteError.CrossChainNotSupported,
      }),
    )
  }

  if (!isKyberSupportedChainId(sellAsset.chainId)) {
    return Err<KyberSupportedChainId, SwapErrorRight>(
      makeSwapErrorRight({
        message: 'KyberSwap only supports configured EVM chains',
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  return Ok<KyberSupportedChainId, SwapErrorRight>(sellAsset.chainId)
}

export const assetIdToKyberToken = (assetId: AssetId): Address =>
  isNativeEvmAsset(assetId) ? KYBER_NATIVE_TOKEN : getAddress(fromAssetId(assetId).assetReference)

export const getKyberFeeParams = ({
  chainId,
  affiliateBps,
}: {
  chainId: KyberSupportedChainId
  affiliateBps: string
}): KyberFeeParams | undefined => {
  if (bnOrZero(affiliateBps).lte(0)) return undefined

  return {
    feeAmount: affiliateBps,
    chargeFeeBy: 'currency_out',
    isInBps: true,
    feeReceiver: getAddress(getTreasuryAddressFromChainId(chainId)),
  }
}

export const getKyberSlippageBps = (slippageTolerancePercentageDecimal: string): number =>
  convertDecimalPercentageToBasisPoints(slippageTolerancePercentageDecimal).toNumber()

// Kyber only returns the post-fee amountOut; the inverse is at most one base unit off
export const getKyberBuyAmountBeforeFees = ({
  buyAmountAfterFeesCryptoBaseUnit,
  affiliateBps,
}: {
  buyAmountAfterFeesCryptoBaseUnit: string
  affiliateBps: string
}): string => {
  if (bnOrZero(affiliateBps).lte(0)) return buyAmountAfterFeesCryptoBaseUnit

  return bn(buyAmountAfterFeesCryptoBaseUnit)
    .times(10_000)
    .div(bn(10_000).minus(affiliateBps))
    .integerValue(BigNumber.ROUND_DOWN)
    .toFixed()
}

export const getKyberProviderNetworkFeeCryptoBaseUnit = ({
  gas,
  gasPrice,
}: {
  gas: string
  gasPrice: string
}): string => bnOrZero(gas).times(bnOrZero(gasPrice)).toFixed(0)

const getKyberCodeError = ({ code, message, requestId }: KyberErrorResponse): SwapErrorRight => {
  const tradeQuoteError = (() => {
    switch (code) {
      case 4008:
      case 4009:
      case 4010:
        return TradeQuoteError.NoRouteFound
      case 4011:
        return TradeQuoteError.UnsupportedTradePair
      case 4005:
      case 4007:
        return TradeQuoteError.SellAmountBelowTradeFee
      case 4221:
        return TradeQuoteError.UnsupportedChain
      default:
        return TradeQuoteError.QueryFailed
    }
  })()

  return makeSwapErrorRight({
    message: `KyberSwap request failed: ${message}`,
    code: tradeQuoteError,
    details: { code, requestId },
  })
}

const isKyberErrorResponse = (value: unknown): value is KyberErrorResponse =>
  typeof value === 'object' &&
  value !== null &&
  'code' in value &&
  typeof value.code === 'number' &&
  'message' in value &&
  typeof value.message === 'string'

export const getKyberRequestError = (error: SwapErrorRight): SwapErrorRight => {
  const { cause } = error

  if (!axios.isAxiosError(cause)) return error

  const status = cause.response?.status

  if (status === 429) {
    return makeSwapErrorRight({
      message: 'KyberSwap rate limit exceeded',
      code: TradeQuoteError.RateLimitExceeded,
    })
  }

  if (status === 404) {
    return makeSwapErrorRight({
      message: 'KyberSwap does not serve this chain',
      code: TradeQuoteError.UnsupportedChain,
    })
  }

  const body: unknown = cause.response?.data
  if (isKyberErrorResponse(body)) return getKyberCodeError(body)

  return makeSwapErrorRight({
    message: `KyberSwap request failed with status ${status}`,
    code: TradeQuoteError.QueryFailed,
    cause,
  })
}

type KyberRouteContext = {
  tokenIn: Address
  tokenOut: Address
  sellAmountCryptoBaseUnit: string
  feeParams: KyberFeeParams | undefined
}

const getExtraFeeError = (
  extraFee: KyberExtraFee,
  feeParams: KyberFeeParams | undefined,
): SwapErrorRight | undefined => {
  if (!feeParams) {
    return extraFee.feeAmount === ''
      ? undefined
      : invalidResponse('KyberSwap returned a fee we did not request', { extraFee })
  }

  // Wrap and unwrap routes come back without the integrator fee
  if (extraFee.feeAmount === '') {
    return makeSwapErrorRight({
      message: 'KyberSwap does not charge the integrator fee on this route',
      code: TradeQuoteError.UnsupportedTradePair,
    })
  }

  const isRequestedFee =
    extraFee.feeAmount === feeParams.feeAmount &&
    extraFee.chargeFeeBy === feeParams.chargeFeeBy &&
    extraFee.isInBps === feeParams.isInBps &&
    isSameAddress(extraFee.feeReceiver, feeParams.feeReceiver)

  return isRequestedFee
    ? undefined
    : invalidResponse('KyberSwap returned a different fee than requested', { extraFee })
}

export const validateKyberRoute = (
  response: KyberRoutesResponse,
  { tokenIn, tokenOut, sellAmountCryptoBaseUnit, feeParams }: KyberRouteContext,
): Result<KyberRouteData, SwapErrorRight> => {
  if (response.code !== 0) return Err(getKyberCodeError(response))

  if (!response.data) return Err(invalidResponse('KyberSwap returned no route'))

  const { routeSummary, routerAddress } = response.data

  if (!isSameAddress(routerAddress, KYBER_ROUTER_ADDRESS)) {
    return Err(invalidResponse(`KyberSwap router ${routerAddress} is not the pinned router`))
  }

  if (!bn(routeSummary.amountIn).eq(sellAmountCryptoBaseUnit)) {
    return Err(
      invalidResponse('KyberSwap routed a different sell amount', {
        amountIn: routeSummary.amountIn,
        sellAmountCryptoBaseUnit,
      }),
    )
  }

  if (
    !isSameAddress(routeSummary.tokenIn, tokenIn) ||
    !isSameAddress(routeSummary.tokenOut, tokenOut)
  ) {
    return Err(invalidResponse('KyberSwap routed a different pair'))
  }

  const feeError = getExtraFeeError(routeSummary.extraFee, feeParams)

  return feeError ? Err(feeError) : Ok(response.data)
}

const decodeKyberSwapDescription = (data: Hex) => {
  try {
    return decodeFunctionData({ abi: KYBER_ROUTER_ABI, data }).args[0].desc
  } catch {
    return undefined
  }
}

type KyberBuildContext = KyberRouteContext & {
  recipient: string
  slippageTolerancePercentageDecimal: string
}

const getBuildError = (
  build: KyberBuildData,
  {
    tokenIn,
    tokenOut,
    sellAmountCryptoBaseUnit,
    feeParams,
    recipient,
    slippageTolerancePercentageDecimal,
  }: KyberBuildContext,
): SwapErrorRight | undefined => {
  if (!isSameAddress(build.routerAddress, KYBER_ROUTER_ADDRESS)) {
    return invalidResponse(`KyberSwap router ${build.routerAddress} is not the pinned router`)
  }

  if (!bn(build.amountIn).eq(sellAmountCryptoBaseUnit)) {
    return invalidResponse('KyberSwap built a different sell amount', { amountIn: build.amountIn })
  }

  const expectedValue = isSameAddress(tokenIn, KYBER_NATIVE_TOKEN) ? sellAmountCryptoBaseUnit : '0'
  if (!bn(build.transactionValue).eq(expectedValue)) {
    return invalidResponse('KyberSwap transaction value does not match the sell amount', {
      transactionValue: build.transactionValue,
      expectedValue,
    })
  }

  const desc = decodeKyberSwapDescription(build.data)
  if (!desc) return makeTradeStepBuildFailedErr('validateKyberBuild')

  if (
    !isSameAddress(desc.srcToken, tokenIn) ||
    !isSameAddress(desc.dstToken, tokenOut) ||
    !bn(desc.amount.toString()).eq(sellAmountCryptoBaseUnit)
  ) {
    return invalidResponse('KyberSwap calldata swaps a different trade')
  }

  if (!isSameAddress(desc.dstReceiver, recipient)) {
    return invalidResponse('KyberSwap calldata pays a different recipient', {
      dstReceiver: desc.dstReceiver,
    })
  }

  const outputFloor = bn(build.amountOut)
    .times(bn(1).minus(slippageTolerancePercentageDecimal))
    .integerValue(BigNumber.ROUND_DOWN)

  if (bn(desc.minReturnAmount.toString()).lt(outputFloor)) {
    return invalidResponse('KyberSwap output floor is below the requested slippage', {
      minReturnAmount: desc.minReturnAmount.toString(),
      outputFloor: outputFloor.toFixed(),
    })
  }

  const feeFlags = desc.flags & KYBER_FEE_FLAGS

  if (!feeParams) {
    return desc.feeReceivers.length === 0 && feeFlags === 0n
      ? undefined
      : invalidResponse('KyberSwap calldata charges a fee we did not request')
  }

  const [feeReceiver] = desc.feeReceivers
  const [feeAmount] = desc.feeAmounts

  const isRequestedFee =
    desc.feeReceivers.length === 1 &&
    isSameAddress(feeReceiver, feeParams.feeReceiver) &&
    desc.feeAmounts.length === 1 &&
    feeAmount.toString() === feeParams.feeAmount &&
    feeFlags === KYBER_FEE_FLAGS

  return isRequestedFee
    ? undefined
    : invalidResponse('KyberSwap calldata does not pay the requested fee', {
        feeReceivers: desc.feeReceivers,
        feeAmounts: desc.feeAmounts.map(amount => amount.toString()),
      })
}

export const validateKyberBuild = (
  response: KyberBuildResponse,
  context: KyberBuildContext,
): Result<KyberBuildData, SwapErrorRight> => {
  if (response.code !== 0) return Err(getKyberCodeError(response))

  if (!response.data) return Err(invalidResponse('KyberSwap returned no transaction'))

  const error = getBuildError(response.data, context)

  return error ? Err(error) : Ok(response.data)
}
