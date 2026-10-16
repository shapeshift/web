import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { BigNumber, bn } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import axios from 'axios'
import type { Address } from 'viem'
import { getAddress, isAddress, isAddressEqual, zeroAddress } from 'viem'

import type { SwapErrorRight } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { isNativeEvmAsset } from '../../../utils/helpers'
import type {
  FyndEncodedQuote,
  FyndErrorResponse,
  FyndQuoteResponse,
  FyndRouteSwap,
} from '../types'
import type { FyndSupportedChainId } from './constants'
import { FYND_CHAINS, FYND_CLIENT_FEE_SHARE, FYND_CLIENT_FEE_SIGNATURE_BYTES } from './constants'

const isFyndSupportedChainId = (chainId: ChainId): chainId is FyndSupportedChainId =>
  chainId in FYND_CHAINS

// Protocol ids look like uniswap_v3, vm:balancer_v2 or fallback:rfq:bebop
const formatFyndProtocol = (protocol: string): string =>
  protocol
    .slice(protocol.lastIndexOf(':') + 1)
    .split('_')
    .map(word =>
      /^v\d+$/.test(word) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(' ')

// The native_wrapper hop is only the WETH wrap/unwrap around the real venues
export const getFyndRouteProtocols = (swaps: FyndRouteSwap[] | undefined): string[] => {
  const venues = (swaps ?? [])
    .map(swap => swap.protocol)
    .filter(protocol => !protocol.endsWith('native_wrapper'))
  return [...new Set(venues)].map(formatFyndProtocol)
}

export const getFyndClientFeeBps = (affiliateBps: string): number =>
  bn(affiliateBps).div(FYND_CLIENT_FEE_SHARE).integerValue(BigNumber.ROUND_CEIL).toNumber()

export const convertAssetIdToFyndToken = (assetId: AssetId): Address => {
  if (isNativeEvmAsset(assetId)) return zeroAddress

  return getAddress(fromAssetId(assetId).assetReference)
}

export const assertValidTrade = ({
  sellAsset,
  buyAsset,
}: {
  sellAsset: Asset
  buyAsset: Asset
}): Result<FyndSupportedChainId, SwapErrorRight> => {
  if (sellAsset.chainId !== buyAsset.chainId) {
    return Err<FyndSupportedChainId, SwapErrorRight>(
      makeSwapErrorRight({
        message: 'Fynd does not support cross-chain trades',
        code: TradeQuoteError.CrossChainNotSupported,
      }),
    )
  }

  if (!isFyndSupportedChainId(sellAsset.chainId)) {
    return Err<FyndSupportedChainId, SwapErrorRight>(
      makeSwapErrorRight({
        message: 'Fynd only supports configured EVM chains',
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  return Ok<FyndSupportedChainId, SwapErrorRight>(sellAsset.chainId)
}

const getFyndStatusError = (status: string, detail?: string): SwapErrorRight => {
  const code = (() => {
    switch (status.toLowerCase()) {
      case 'no_route_found':
      case 'insufficient_liquidity':
        return TradeQuoteError.NoRouteFound
      case 'timeout':
        return TradeQuoteError.Timeout
      default:
        return TradeQuoteError.QueryFailed
    }
  })()

  return makeSwapErrorRight({
    message: `Fynd quote failed: ${status}${detail ? ` (${detail})` : ''}`,
    code,
  })
}

const isFyndErrorResponse = (value: unknown): value is FyndErrorResponse =>
  typeof value === 'object' &&
  value !== null &&
  'error' in value &&
  typeof value.error === 'string' &&
  'code' in value &&
  typeof value.code === 'string'

export const getFyndRequestError = (error: SwapErrorRight): SwapErrorRight => {
  const { cause } = error

  if (!axios.isAxiosError(cause)) return error

  if (cause.response?.status === 429) {
    return makeSwapErrorRight({
      message: 'Fynd rate limit exceeded',
      code: TradeQuoteError.RateLimitExceeded,
    })
  }

  const body: unknown = cause.response?.data
  if (isFyndErrorResponse(body)) return getFyndStatusError(body.code, body.error)

  return makeSwapErrorRight({
    message: `Fynd request failed with status ${cause.response?.status}`,
    code: TradeQuoteError.QueryFailed,
    cause,
  })
}

const invalidResponse = (message: string, details?: unknown): SwapErrorRight =>
  makeSwapErrorRight({ message, details, code: TradeQuoteError.InvalidResponse })

type FyndQuoteContext = {
  chainId: FyndSupportedChainId
  sellAsset: Asset
  sellAmountCryptoBaseUnit: string
  slippageTolerancePercentageDecimal: string
  clientFeeBps: number
}

const getQuoteError = (
  quote: FyndEncodedQuote,
  {
    chainId,
    sellAsset,
    sellAmountCryptoBaseUnit,
    slippageTolerancePercentageDecimal,
    clientFeeBps,
  }: FyndQuoteContext,
): SwapErrorRight | undefined => {
  const { transaction, fee_breakdown: fees } = quote
  const pinnedRouter = FYND_CHAINS[chainId].routerAddress

  if (
    !isAddress(transaction.to, { strict: false }) ||
    !isAddressEqual(transaction.to, pinnedRouter)
  ) {
    return invalidResponse(
      `Fynd router ${transaction.to} is not the pinned router ${pinnedRouter} for ${chainId}`,
    )
  }

  if (!bn(quote.amount_in).eq(sellAmountCryptoBaseUnit)) {
    return invalidResponse('Fynd quoted a different sell amount', {
      amountIn: quote.amount_in,
      sellAmountCryptoBaseUnit,
    })
  }

  const expectedValue = isNativeEvmAsset(sellAsset.assetId) ? sellAmountCryptoBaseUnit : '0'
  if (!bn(transaction.value).eq(expectedValue)) {
    return invalidResponse('Fynd transaction value does not match the sell amount', {
      value: transaction.value,
      expectedValue,
    })
  }

  // The router enforces min_amount_received, which may not be looser than the requested slippage
  const netOutput = bn(quote.amount_out).minus(fees.router_fee).minus(fees.client_fee)
  const outputFloor = netOutput
    .times(bn(1).minus(slippageTolerancePercentageDecimal))
    .integerValue(BigNumber.ROUND_DOWN)

  if (bn(fees.min_amount_received).lt(outputFloor)) {
    return invalidResponse('Fynd output floor is below the requested slippage', {
      minAmountReceived: fees.min_amount_received,
      outputFloor: outputFloor.toFixed(),
      slippageTolerancePercentageDecimal,
    })
  }

  if (clientFeeBps === 0) {
    if (!bn(fees.client_fee).isZero()) {
      return invalidResponse('Fynd returned an unexpected client fee', {
        clientFee: fees.client_fee,
      })
    }

    return
  }

  // Our share of the gross client fee, allowing one unit of rounding
  const minClientFee = bn(quote.amount_out)
    .times(clientFeeBps)
    .div(10_000)
    .times(FYND_CLIENT_FEE_SHARE)
    .integerValue(BigNumber.ROUND_DOWN)
    .minus(1)

  if (bn(fees.client_fee).lt(minClientFee)) {
    return invalidResponse('Fynd client fee is below the requested share', {
      clientFee: fees.client_fee,
      amountOut: quote.amount_out,
      clientFeeBps,
    })
  }

  // The proxy patches the signature over Fynd's zeroed placeholder at the reported offset
  const offset = transaction.client_fee_signature_offset
  const signature =
    typeof offset === 'number'
      ? transaction.data.slice(2 + offset * 2, 2 + (offset + FYND_CLIENT_FEE_SIGNATURE_BYTES) * 2)
      : ''

  if (signature.length !== FYND_CLIENT_FEE_SIGNATURE_BYTES * 2 || /^0+$/.test(signature)) {
    return invalidResponse('Fynd quote is not signed for the client fee', { offset })
  }

  if (!quote.client_fee_deadline) {
    return invalidResponse('Fynd quote is missing its client fee deadline')
  }
}

export const validateFyndQuoteResponse = (
  response: FyndQuoteResponse,
  context: FyndQuoteContext,
): Result<FyndEncodedQuote, SwapErrorRight> => {
  const order = Array.isArray(response?.orders) ? response.orders[0] : undefined

  if (!order) return Err(invalidResponse('Fynd returned no order'))
  if (order.status !== 'success') return Err(getFyndStatusError(order.status))

  const error = getQuoteError(order, context)

  return error ? Err(error) : Ok(order)
}
