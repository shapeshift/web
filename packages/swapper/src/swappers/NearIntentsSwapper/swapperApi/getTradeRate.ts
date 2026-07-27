import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight, SwapperDeps, TradeRate } from '../../../types'
import type { NearIntentsTradeRateInput } from '../types'
import { QuoteRequest } from '../types'
import { getNearIntentsStepData } from '../utils/getNearIntentsStepData'
import { getNearIntentsTradeContext } from '../utils/getNearIntentsTradeContext'
import {
  buildNearIntentsQuoteRequest,
  fetchNearIntentsQuote,
  getNearIntentsQuoteDeadline,
  resolveNearIntentsAssets,
} from '../utils/helpers'
import { initializeOneClickService } from '../utils/oneClickService'

export const getTradeRate = async (
  input: NearIntentsTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<TradeRate[], SwapErrorRight>> => {
  const {
    accountNumber,
    sellAsset,
    buyAsset,
    affiliateBps,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmount,
    receiveAddress,
  } = input

  initializeOneClickService(deps.config.VITE_NEAR_INTENTS_API_KEY)

  const maybeAssets = await resolveNearIntentsAssets({ sellAsset, buyAsset })
  if (maybeAssets.isErr()) return Err(maybeAssets.unwrapErr())
  const { originAsset, destinationAsset } = maybeAssets.unwrap()

  const quoteRequest = buildNearIntentsQuoteRequest({
    originAsset,
    destinationAsset,
    sellAmountCryptoBaseUnit: sellAmount,
    slippageTolerancePercentageDecimal: input.slippageTolerancePercentageDecimal,
    affiliateBps,
    refundTo: 'check-price',
    recipient: receiveAddress ?? 'check-price',
    refundType: QuoteRequest.refundType.INTENTS,
    recipientType: QuoteRequest.recipientType.INTENTS,
    deadline: getNearIntentsQuoteDeadline({ sellAsset, buyAsset }),
  })

  const maybeQuoteResponse = await fetchNearIntentsQuote({ quoteRequest, sellAsset })
  if (maybeQuoteResponse.isErr()) return Err(maybeQuoteResponse.unwrapErr())
  const { quote } = maybeQuoteResponse.unwrap()

  const maybeContext = getNearIntentsTradeContext({ input, deps, quote })
  if (maybeContext.isErr()) return Err(maybeContext.unwrapErr())
  const { tradeCommon, stepCommon, protocolFees, stepDataArgs } = maybeContext.unwrap()

  const maybeStepData = await getNearIntentsStepData({
    ...stepDataArgs,
    type: 'rate',
    input,
  })

  if (maybeStepData.isErr()) return Err(maybeStepData.unwrapErr())
  const { networkFeeCryptoBaseUnit } = maybeStepData.unwrap()

  const tradeRate: TradeRate = {
    ...tradeCommon,
    quoteOrRate: 'rate' as const,
    receiveAddress: receiveAddress ?? undefined,
    steps: [
      {
        ...stepCommon,
        accountNumber,
        feeData: { protocolFees, networkFeeCryptoBaseUnit: networkFeeCryptoBaseUnit ?? '0' },
      },
    ],
  }

  return Ok([tradeRate])
}
