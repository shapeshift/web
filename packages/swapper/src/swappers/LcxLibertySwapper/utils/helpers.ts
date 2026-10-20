import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { BigNumber, bn } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import axios from 'axios'
import type { Address, Hex } from 'viem'
import { decodeFunctionData, getAddress, isAddress, isAddressEqual, zeroAddress } from 'viem'

import type { SwapErrorRight } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { isNativeEvmAsset } from '../../../utils/helpers'
import type {
  LcxLibertyBuildResponse,
  LcxLibertyErrorResponse,
  LcxLibertyQuote,
  LcxLibertyQuoteResponse,
  LcxLibertySwapTransaction,
} from '../types'
import type { LcxLibertySupportedChainId } from './constants'
import {
  LCX_LIBERTY_MAX_SLIPPAGE_BPS,
  LCX_LIBERTY_ROUTER_ABI,
  LCX_LIBERTY_ROUTER_BY_CHAIN_ID,
} from './constants'

const isLcxLibertySupportedChainId = (chainId: ChainId): chainId is LcxLibertySupportedChainId =>
  chainId in LCX_LIBERTY_ROUTER_BY_CHAIN_ID

export const getLcxLibertyChainReference = (chainId: LcxLibertySupportedChainId): number =>
  Number(fromChainId(chainId).chainReference)

export const convertAssetIdToLcxLibertyToken = (assetId: AssetId): Address => {
  if (isNativeEvmAsset(assetId)) return zeroAddress

  return getAddress(fromAssetId(assetId).assetReference)
}

// LCX Liberty DEX takes whole basis points and refuses more than 20%
export const getLcxLibertySlippageBps = (slippageTolerancePercentageDecimal: string): number =>
  BigNumber.min(
    bn(slippageTolerancePercentageDecimal).times(10_000).integerValue(BigNumber.ROUND_DOWN),
    LCX_LIBERTY_MAX_SLIPPAGE_BPS,
  ).toNumber()

export const assertValidTrade = ({
  sellAsset,
  buyAsset,
}: {
  sellAsset: Asset
  buyAsset: Asset
}): Result<LcxLibertySupportedChainId, SwapErrorRight> => {
  if (sellAsset.chainId !== buyAsset.chainId) {
    return Err<LcxLibertySupportedChainId, SwapErrorRight>(
      makeSwapErrorRight({
        message: 'LCX Liberty DEX does not support cross-chain trades',
        code: TradeQuoteError.CrossChainNotSupported,
      }),
    )
  }

  if (!isLcxLibertySupportedChainId(sellAsset.chainId)) {
    return Err<LcxLibertySupportedChainId, SwapErrorRight>(
      makeSwapErrorRight({
        message: 'LCX Liberty DEX only supports configured EVM chains',
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  return Ok<LcxLibertySupportedChainId, SwapErrorRight>(sellAsset.chainId)
}

const getLcxLibertyErrorCode = (code: string): TradeQuoteError => {
  switch (code) {
    case 'no_route':
    case 'insufficient_liquidity':
    case 'pricing_unreliable':
      return TradeQuoteError.NoRouteFound
    case 'unknown_chain':
      return TradeQuoteError.UnsupportedChain
    case 'native_is_a_token':
      return TradeQuoteError.UnsupportedTradePair
    case 'RATE_LIMITED':
    case 'TEMPORARILY_BLOCKED':
      return TradeQuoteError.RateLimitExceeded
    default:
      return TradeQuoteError.QueryFailed
  }
}

const isLcxLibertyErrorResponse = (value: unknown): value is LcxLibertyErrorResponse =>
  typeof value === 'object' &&
  value !== null &&
  'code' in value &&
  typeof value.code === 'string' &&
  'message' in value &&
  typeof value.message === 'string'

export const getLcxLibertyRequestError = (error: SwapErrorRight): SwapErrorRight => {
  const { cause } = error

  if (!axios.isAxiosError(cause)) return error

  if (cause.response?.status === 429) {
    return makeSwapErrorRight({
      message: 'LCX Liberty DEX rate limit exceeded',
      code: TradeQuoteError.RateLimitExceeded,
    })
  }

  const body: unknown = cause.response?.data
  if (isLcxLibertyErrorResponse(body)) {
    return makeSwapErrorRight({
      message: `LCX Liberty DEX request failed: ${body.code} (${body.message})`,
      code: getLcxLibertyErrorCode(body.code),
    })
  }

  return makeSwapErrorRight({
    message: `LCX Liberty DEX request failed with status ${cause.response?.status}`,
    code: TradeQuoteError.QueryFailed,
    cause,
  })
}

const invalidResponse = (message: string, details?: unknown): SwapErrorRight =>
  makeSwapErrorRight({ message, details, code: TradeQuoteError.InvalidResponse })

const isSameAddress = (address: string, expected: Address): boolean =>
  isAddress(address, { strict: false }) && isAddressEqual(address, expected)

const isPinnedRouter = (
  address: string | null | undefined,
  chainId: LcxLibertySupportedChainId,
): boolean =>
  typeof address === 'string' && isSameAddress(address, LCX_LIBERTY_ROUTER_BY_CHAIN_ID[chainId])

type LcxLibertyQuoteContext = {
  chainId: LcxLibertySupportedChainId
  sellAsset: Asset
  buyAsset: Asset
  sellAmountCryptoBaseUnit: string
  slippageBps: number
}

const getQuoteError = (
  quote: LcxLibertyQuote,
  { chainId, sellAsset, buyAsset, sellAmountCryptoBaseUnit, slippageBps }: LcxLibertyQuoteContext,
): SwapErrorRight | undefined => {
  if (quote.chainId !== getLcxLibertyChainReference(chainId)) {
    return invalidResponse('LCX Liberty DEX quoted a different chain', {
      quoteChainId: quote.chainId,
      chainId,
    })
  }

  if (
    !isSameAddress(quote.input.token, convertAssetIdToLcxLibertyToken(sellAsset.assetId)) ||
    !isSameAddress(quote.output.token, convertAssetIdToLcxLibertyToken(buyAsset.assetId))
  ) {
    return invalidResponse('LCX Liberty DEX quoted a different pair', {
      tokenIn: quote.input.token,
      tokenOut: quote.output.token,
    })
  }

  if (!isPinnedRouter(quote.spender, chainId)) {
    return invalidResponse(
      `LCX Liberty DEX spender ${quote.spender} is not the pinned router for ${chainId}`,
    )
  }

  if (!bn(quote.input.amount).eq(sellAmountCryptoBaseUnit)) {
    return invalidResponse('LCX Liberty DEX quoted a different sell amount', {
      amountIn: quote.input.amount,
      sellAmountCryptoBaseUnit,
    })
  }

  if (quote.slippageBps !== slippageBps) {
    return invalidResponse('LCX Liberty DEX quoted a different slippage', {
      quoteSlippageBps: quote.slippageBps,
      slippageBps,
    })
  }

  // No integrator is sent, so the quote must carry no fee
  if (!bn(quote.fee.amount).isZero()) {
    return invalidResponse('LCX Liberty DEX returned a fee we did not request', {
      fee: quote.fee,
    })
  }

  const buyAmount = bn(quote.output.amount)

  if (!buyAmount.gt(0)) {
    return makeSwapErrorRight({
      message: 'LCX Liberty DEX quoted no output',
      code: TradeQuoteError.NoRouteFound,
    })
  }

  // The router enforces minimumAmount, which may not be looser than the requested slippage
  const outputFloor = buyAmount
    .times(10_000 - slippageBps)
    .div(10_000)
    .integerValue(BigNumber.ROUND_DOWN)

  if (bn(quote.output.minimumAmount).lt(outputFloor)) {
    return invalidResponse('LCX Liberty DEX output floor is below the requested slippage', {
      minimumAmount: quote.output.minimumAmount,
      outputFloor: outputFloor.toFixed(),
      slippageBps,
    })
  }
}

export const validateLcxLibertyQuoteResponse = (
  response: LcxLibertyQuoteResponse,
  context: LcxLibertyQuoteContext,
): Result<LcxLibertyQuote, SwapErrorRight> => {
  const quote = response?.data?.quote

  if (!quote) return Err(invalidResponse('LCX Liberty DEX returned no quote'))

  const error = getQuoteError(quote, context)

  return error ? Err(error) : Ok(quote)
}

type LcxLibertySwapFields = {
  tokenIn: Address
  tokenOut: Address
  amountIn: string
  minAmountOut: string
  recipient: Address
  deadline: string
  legsAmountIn: string
  hopPools: Address[]
}

// Only swapSplit decodes: maker, order book and any other entrypoint are refused
const decodeLcxLibertySwap = (data: Hex): LcxLibertySwapFields | undefined => {
  try {
    const { args } = decodeFunctionData({ abi: LCX_LIBERTY_ROUTER_ABI, data })
    const [tokenIn, tokenOut, amountIn, minAmountOut, recipient, deadline, legs] = args

    return {
      tokenIn,
      tokenOut,
      amountIn: amountIn.toString(),
      minAmountOut: minAmountOut.toString(),
      recipient,
      deadline: deadline.toString(),
      legsAmountIn: legs.reduce((total, leg) => total + leg.amountIn, 0n).toString(),
      hopPools: legs.flatMap(leg => leg.hops.map(hop => hop.pool)),
    }
  } catch {
    return undefined
  }
}

type LcxLibertyBuildContext = {
  chainId: LcxLibertySupportedChainId
  sellAsset: Asset
  buyAsset: Asset
  sellAmountCryptoBaseUnit: string
  receiveAddress: Address
  minimumBuyAmountCryptoBaseUnit: string
  nowSeconds?: number
}

export const validateLcxLibertyBuildResponse = (
  response: LcxLibertyBuildResponse,
  {
    chainId,
    sellAsset,
    buyAsset,
    sellAmountCryptoBaseUnit,
    receiveAddress,
    minimumBuyAmountCryptoBaseUnit,
    nowSeconds = Math.floor(Date.now() / 1000),
  }: LcxLibertyBuildContext,
): Result<{ transaction: LcxLibertySwapTransaction; deadlineSeconds: number }, SwapErrorRight> => {
  const transaction = response?.data?.swap

  if (!transaction) return Err(invalidResponse('LCX Liberty DEX returned no transaction'))

  if (transaction.chainId !== getLcxLibertyChainReference(chainId)) {
    return Err(
      invalidResponse('LCX Liberty DEX built for a different chain', {
        transactionChainId: transaction.chainId,
        chainId,
      }),
    )
  }

  if (!isPinnedRouter(transaction.to, chainId)) {
    return Err(
      invalidResponse(
        `LCX Liberty DEX router ${transaction.to} is not the pinned router for ${chainId}`,
      ),
    )
  }

  const expectedValue = isNativeEvmAsset(sellAsset.assetId) ? sellAmountCryptoBaseUnit : '0'
  if (!bn(transaction.value).eq(expectedValue)) {
    return Err(
      invalidResponse('LCX Liberty DEX transaction value does not match the sell amount', {
        value: transaction.value,
        expectedValue,
      }),
    )
  }

  // The calldata, not the JSON around it, is what the router executes
  const swap = decodeLcxLibertySwap(transaction.data)

  if (!swap) {
    return Err(invalidResponse('LCX Liberty DEX calldata is not a known router entrypoint'))
  }

  if (
    !isAddressEqual(swap.tokenIn, convertAssetIdToLcxLibertyToken(sellAsset.assetId)) ||
    !isAddressEqual(swap.tokenOut, convertAssetIdToLcxLibertyToken(buyAsset.assetId))
  ) {
    return Err(invalidResponse('LCX Liberty DEX calldata swaps a different pair', swap))
  }

  if (!bn(swap.amountIn).eq(sellAmountCryptoBaseUnit)) {
    return Err(invalidResponse('LCX Liberty DEX calldata sells a different amount', swap))
  }

  if (bn(swap.legsAmountIn).gt(swap.amountIn)) {
    return Err(
      invalidResponse('LCX Liberty DEX calldata legs spend more than the sell amount', swap),
    )
  }

  // A hop calls its pool, which may never be the traded tokens or the router itself
  const isUnsafeHopPool = (pool: Address): boolean =>
    isAddressEqual(pool, swap.tokenIn) ||
    isAddressEqual(pool, swap.tokenOut) ||
    isAddressEqual(pool, transaction.to)

  if (swap.hopPools.some(isUnsafeHopPool)) {
    return Err(
      invalidResponse('LCX Liberty DEX calldata routes through a forbidden contract', swap),
    )
  }

  if (!isAddressEqual(swap.recipient, receiveAddress)) {
    return Err(invalidResponse('LCX Liberty DEX calldata pays a different recipient', swap))
  }

  if (bn(swap.minAmountOut).lt(minimumBuyAmountCryptoBaseUnit)) {
    return Err(
      invalidResponse('LCX Liberty DEX calldata floor is below the quoted minimum', {
        minAmountOut: swap.minAmountOut,
        minimumBuyAmountCryptoBaseUnit,
      }),
    )
  }

  const deadlineSeconds = Number(swap.deadline)

  if (!Number.isSafeInteger(deadlineSeconds) || deadlineSeconds <= nowSeconds) {
    return Err(invalidResponse('LCX Liberty DEX calldata deadline has passed', swap))
  }

  return Ok({ transaction, deadlineSeconds })
}
