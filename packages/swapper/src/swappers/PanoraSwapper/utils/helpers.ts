import type { AssetId } from '@shapeshiftoss/caip'
import { aptosChainId, ASSET_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import { aptos } from '@shapeshiftoss/chain-adapters'
import type { Asset } from '@shapeshiftoss/types'
import { bn, bnOrZero, toBaseUnit } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import axios from 'axios'

import type { SwapErrorRight, TradeStepCommon } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { getInputOutputRate, makeSwapErrorRight, makeTradeStepBuildFailedErr } from '../../../utils'
import { getTreasuryAddressFromChainId } from '../../../utils/helpers'
import type {
  PanoraQuote,
  PanoraSwapRequest,
  PanoraSwapResponse,
  PanoraTradeQuoteInput,
  PanoraTradeRateInput,
} from '../types'
import { PANORA_INTEGRATOR_FEE_SPLIT_MULTIPLIER } from './constants'

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
  return assetNamespace === ASSET_NAMESPACE.slip44 ? aptos.APT_COIN_TYPE : assetReference
}

export const getPanoraFeeParams = (
  affiliateBps: string,
): Pick<PanoraSwapRequest, 'integratorFeePercentage' | 'integratorFeeAddress'> => {
  if (bnOrZero(affiliateBps).lte(0)) return {}

  return {
    integratorFeePercentage: bn(affiliateBps)
      .times(PANORA_INTEGRATOR_FEE_SPLIT_MULTIPLIER)
      .div(100)
      .toNumber(),
    integratorFeeAddress: getTreasuryAddressFromChainId(aptosChainId),
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
      : cause.message

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
}: {
  response: PanoraSwapResponse
  sellAsset: Asset
  buyAsset: Asset
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

  // Panora amounts are in whole token units, so a decimals mismatch would sell and quote the wrong base unit amounts
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

  const maybePayload = (() => {
    try {
      return Ok(aptos.extractEntryFunctionPayload(quote.rawTransaction.bcs))
    } catch (error) {
      return Err(makeTradeStepBuildFailedErr('validatePanoraSwap', error))
    }
  })()

  if (maybePayload.isErr()) return Err(maybePayload.unwrapErr())

  return Ok({ quote, payload: maybePayload.unwrap() })
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
