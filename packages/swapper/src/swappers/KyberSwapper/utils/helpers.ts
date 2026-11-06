import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { BigNumber, bn, bnOrZero } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import axios from 'axios'
import type { Address } from 'viem'
import { getAddress, isAddress, isAddressEqual } from 'viem'

import type { SwapErrorRight, TradeStepCommon } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { getInputOutputRate, makeSwapErrorRight } from '../../../utils'
import { buildAffiliateFee } from '../../../utils/affiliateFee'
import { getTreasuryAddressFromChainId, isNativeEvmAsset } from '../../../utils/helpers'
import type {
  KyberBuildData,
  KyberBuildResponse,
  KyberErrorResponse,
  KyberFeeParams,
  KyberRoutesResponse,
  KyberRouteSummary,
  KyberTradeQuoteInput,
  KyberTradeRateInput,
} from '../types'
import type { KyberSupportedChainId } from './constants'
import { KYBER_CHAINS, KYBER_NATIVE_TOKEN, KYBER_ROUTER_ADDRESS } from './constants'

const isKyberSupportedChainId = (chainId: ChainId): chainId is KyberSupportedChainId =>
  chainId in KYBER_CHAINS

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

export const getKyberTradeAmounts = ({
  input,
  amountOut,
}: {
  input: KyberTradeQuoteInput | KyberTradeRateInput
  amountOut: string
}): Pick<
  TradeStepCommon,
  'rate' | 'buyAmountBeforeFeesCryptoBaseUnit' | 'buyAmountAfterFeesCryptoBaseUnit' | 'affiliateFee'
> => {
  const { sellAsset, buyAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit, affiliateBps } = input

  const buyAmountAfterFeesCryptoBaseUnit = amountOut
  const buyAmountBeforeFeesCryptoBaseUnit = getKyberBuyAmountBeforeFees({
    buyAmountAfterFeesCryptoBaseUnit,
    affiliateBps,
  })

  return {
    rate: getInputOutputRate({
      sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
      sellAsset,
      buyAsset,
    }),
    buyAmountBeforeFeesCryptoBaseUnit,
    buyAmountAfterFeesCryptoBaseUnit,
    affiliateFee: buildAffiliateFee({
      strategy: 'buy_asset',
      affiliateBps,
      sellAsset,
      buyAsset,
      sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAmountCryptoBaseUnit: buyAmountBeforeFeesCryptoBaseUnit,
    }),
  }
}

const getKyberCodeError = ({ code, message, requestId }: KyberErrorResponse): SwapErrorRight => {
  const tradeQuoteError = (() => {
    switch (code) {
      case 4008:
      case 4009:
      case 4010:
        return TradeQuoteError.NoRouteFound
      case 4011:
      case 4221:
        return TradeQuoteError.UnsupportedTradePair
      case 4005:
      case 4007:
        return TradeQuoteError.SellAmountBelowTradeFee
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

const isPinnedRouter = (routerAddress: string): boolean =>
  isAddress(routerAddress) && isAddressEqual(routerAddress, KYBER_ROUTER_ADDRESS)

const unpinnedRouterError = (routerAddress: string): SwapErrorRight =>
  invalidResponse(`KyberSwap router ${routerAddress} is not the pinned router`)

export const validateKyberRoute = (
  response: KyberRoutesResponse,
  feeParams: KyberFeeParams | undefined,
): Result<KyberRouteSummary, SwapErrorRight> => {
  if (response.code !== 0) return Err(getKyberCodeError(response))
  if (!response.data) return Err(invalidResponse('KyberSwap returned no route'))

  const { routeSummary, routerAddress } = response.data
  if (!isPinnedRouter(routerAddress)) return Err(unpinnedRouterError(routerAddress))

  // Kyber skips the integrator fee on wrap and unwrap routes, so reject them rather than swap fee-free
  if (feeParams && routeSummary.extraFee.feeAmount === '') {
    return Err(
      makeSwapErrorRight({
        message: 'KyberSwap does not charge the integrator fee on this route',
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )
  }

  return Ok(routeSummary)
}

export const validateKyberBuild = (
  response: KyberBuildResponse,
): Result<KyberBuildData, SwapErrorRight> => {
  if (response.code !== 0) return Err(getKyberCodeError(response))

  if (!response.data) return Err(invalidResponse('KyberSwap returned no transaction'))

  const { routerAddress } = response.data

  if (!isPinnedRouter(routerAddress)) return Err(unpinnedRouterError(routerAddress))

  return Ok(response.data)
}
