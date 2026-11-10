import type { AssetId } from '@shapeshiftoss/caip'
import { aptosChainId, ASSET_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import { aptos } from '@shapeshiftoss/chain-adapters'
import type { Asset } from '@shapeshiftoss/types'
import { bn, bnOrZero, isTreasuryChainId, toBaseUnit } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import axios from 'axios'

import type { SwapErrorRight, TradeStepCommon } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { getInputOutputRate, makeSwapErrorRight } from '../../../utils'
import { getTreasuryAddressFromChainId } from '../../../utils/helpers'
import type {
  PanoraQuote,
  PanoraSwapRequest,
  PanoraSwapResponse,
  PanoraTradeQuoteInput,
  PanoraTradeRateInput,
} from '../types'
import {
  PANORA_NATIVE_TOKEN_ADDRESS,
  PANORA_ROUTER_ARG_INDEX,
  PANORA_ROUTER_FUNCTION,
} from './constants'

const invalidResponse = (message: string, details?: unknown): SwapErrorRight =>
  makeSwapErrorRight({ message, details, code: TradeQuoteError.InvalidResponse })

export const assertValidTrade = ({
  sellAsset,
  buyAsset,
}: {
  sellAsset: Asset
  buyAsset: Asset
}): Result<true, SwapErrorRight> => {
  if (sellAsset.chainId !== buyAsset.chainId) {
    return Err(
      makeSwapErrorRight({
        message: 'Panora does not support cross-chain trades',
        code: TradeQuoteError.CrossChainNotSupported,
      }),
    )
  }

  if (sellAsset.chainId !== aptosChainId) {
    return Err(
      makeSwapErrorRight({
        message: 'Panora only supports Aptos',
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  return Ok<true, SwapErrorRight>(true)
}

export const assetIdToPanoraToken = (assetId: AssetId): string => {
  const { assetNamespace, assetReference } = fromAssetId(assetId)
  return assetNamespace === ASSET_NAMESPACE.slip44 ? PANORA_NATIVE_TOKEN_ADDRESS : assetReference
}

// Panora deducts the integrator fee without an address but keeps it, so it is only charged with one
export const getPanoraIntegratorFeeAddress = (): string | undefined =>
  isTreasuryChainId(aptosChainId) ? getTreasuryAddressFromChainId(aptosChainId) : undefined

export const getPanoraFeeParams = ({
  affiliateBps,
  integratorFeeAddress,
}: {
  affiliateBps: string
  integratorFeeAddress: string | undefined
}): Pick<PanoraSwapRequest, 'integratorFeePercentage' | 'integratorFeeAddress'> => {
  if (!integratorFeeAddress || bnOrZero(affiliateBps).lte(0)) return {}

  return {
    integratorFeePercentage: bn(affiliateBps).div(100).toNumber(),
    integratorFeeAddress,
  }
}

export const getPanoraRequestError = (error: SwapErrorRight): SwapErrorRight => {
  const { cause } = error

  if (!axios.isAxiosError(cause)) return error

  const status = cause.response?.status

  if (status === 429) {
    return makeSwapErrorRight({
      message: 'Panora rate limit exceeded',
      code: TradeQuoteError.RateLimitExceeded,
    })
  }

  const body: unknown = cause.response?.data
  const message =
    typeof body === 'object' &&
    body !== null &&
    'message' in body &&
    typeof body.message === 'string'
      ? body.message
      : `status ${status}`

  return makeSwapErrorRight({
    message: `Panora request failed: ${message}`,
    code: TradeQuoteError.QueryFailed,
    cause,
  })
}

export type ValidatedPanoraSwap = {
  quote: PanoraQuote
  payload: string
}

export const validatePanoraSwap = ({
  response,
  sellAsset,
  buyAsset,
  sellAmountCryptoBaseUnit,
  toWalletAddress,
  integratorFeeAddress,
}: {
  response: PanoraSwapResponse
  sellAsset: Asset
  buyAsset: Asset
  sellAmountCryptoBaseUnit: string
  toWalletAddress: string
  integratorFeeAddress: string | undefined
}): Result<ValidatedPanoraSwap, SwapErrorRight> => {
  const { fromToken, toToken, feeToken, quotes } = response

  const quote = quotes?.[0]
  if (!quote) {
    return Err(
      makeSwapErrorRight({
        message: 'Panora returned no route',
        code: TradeQuoteError.NoRouteFound,
      }),
    )
  }

  // Panora reads unknown tokens back with null decimals, and its amounts are in token units
  if (fromToken.decimals !== sellAsset.precision || toToken.decimals !== buyAsset.precision) {
    return Err(
      makeSwapErrorRight({
        message: 'Panora token decimals do not match the trade assets',
        code: TradeQuoteError.UnsupportedTradePair,
        details: { fromToken, toToken },
      }),
    )
  }

  if (!aptos.addressesMatch(feeToken.address, toToken.address)) {
    return Err(invalidResponse('Panora charged its fee in a token other than the buy asset'))
  }

  const maybeDecoded = (() => {
    try {
      return Ok(aptos.decodeEntryFunctionTransaction(quote.rawTransaction.bcs))
    } catch (error) {
      return Err(invalidResponse('Panora returned an undecodable transaction', error))
    }
  })()
  if (maybeDecoded.isErr()) return Err(maybeDecoded.unwrapErr())
  const { function: fn, args, payload } = maybeDecoded.unwrap()

  if (fn !== PANORA_ROUTER_FUNCTION) {
    return Err(invalidResponse(`Panora transaction calls ${fn}, not the pinned router`))
  }

  try {
    const recipient = aptos.deserializeAddressArg(args[PANORA_ROUTER_ARG_INDEX.recipient])
    if (!aptos.addressesMatch(recipient, toWalletAddress)) {
      return Err(invalidResponse('Panora transaction pays out to the wrong recipient'))
    }

    const sellAmount = aptos
      .deserializeU64VectorArg(args[PANORA_ROUTER_ARG_INDEX.sellAmounts])
      .reduce((sum, amount) => sum + amount, 0n)
    if (sellAmount.toString() !== sellAmountCryptoBaseUnit) {
      return Err(invalidResponse('Panora transaction sells a different amount than quoted'))
    }

    if (integratorFeeAddress) {
      const feeAddress = aptos.deserializeAddressArg(
        args[PANORA_ROUTER_ARG_INDEX.integratorFeeAddress],
      )
      if (!aptos.addressesMatch(feeAddress, integratorFeeAddress)) {
        return Err(invalidResponse('Panora transaction pays the integrator fee elsewhere'))
      }
    }
  } catch (error) {
    return Err(invalidResponse('Panora transaction has unexpected router arguments', error))
  }

  return Ok({ quote, payload })
}

export const getPanoraTradeAmounts = ({
  input,
  quote,
}: {
  input: PanoraTradeQuoteInput | PanoraTradeRateInput
  quote: PanoraQuote
}): Pick<
  TradeStepCommon,
  'rate' | 'buyAmountBeforeFeesCryptoBaseUnit' | 'buyAmountAfterFeesCryptoBaseUnit' | 'affiliateFee'
> => {
  const { sellAsset, buyAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit } = input

  // toTokenAmount is net of the integrator fee, which Panora charges in the buy asset
  const buyAmountAfterFeesCryptoBaseUnit = toBaseUnit(quote.toTokenAmount, buyAsset.precision)
  const affiliateFeeCryptoBaseUnit = toBaseUnit(quote.feeTokenAmount, buyAsset.precision)

  return {
    rate: getInputOutputRate({
      sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
      sellAsset,
      buyAsset,
    }),
    buyAmountBeforeFeesCryptoBaseUnit: bn(buyAmountAfterFeesCryptoBaseUnit)
      .plus(affiliateFeeCryptoBaseUnit)
      .toFixed(),
    buyAmountAfterFeesCryptoBaseUnit,
    affiliateFee: bn(affiliateFeeCryptoBaseUnit).gt(0)
      ? {
          assetId: buyAsset.assetId,
          amountCryptoBaseUnit: affiliateFeeCryptoBaseUnit,
          asset: buyAsset,
        }
      : undefined,
  }
}
