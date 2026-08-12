import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight, SwapperDeps, TradeRate } from '../../../types'
import { getTradeAmount } from '../../../utils/helpers'
import type { NearIntentsExactOutputTradeRateInput, NearIntentsTradeRateInput } from '../types'
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

const getRate = async (
  input: NearIntentsTradeRateInput | NearIntentsExactOutputTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<TradeRate[], SwapErrorRight>> => {
  const { accountNumber, sellAsset, buyAsset, affiliateBps, receiveAddress, sendAddress } = input

  initializeOneClickService(deps.config.VITE_NEAR_INTENTS_API_KEY)

  const amount = getTradeAmount(input)

  const maybeAssets = await resolveNearIntentsAssets({ sellAsset, buyAsset })
  if (maybeAssets.isErr()) return Err(maybeAssets.unwrapErr())
  const { originAsset, destinationAsset } = maybeAssets.unwrap()

  const quoteRequest = buildNearIntentsQuoteRequest({
    originAsset,
    destinationAsset,
    amount,
    slippageTolerancePercentageDecimal: input.slippageTolerancePercentageDecimal,
    affiliateBps,
    refundTo: sendAddress ?? 'check-price',
    recipient: receiveAddress ?? 'check-price',
    refundType: sendAddress
      ? QuoteRequest.refundType.ORIGIN_CHAIN
      : QuoteRequest.refundType.INTENTS,
    recipientType: sendAddress
      ? QuoteRequest.recipientType.DESTINATION_CHAIN
      : QuoteRequest.recipientType.INTENTS,
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
    from: sendAddress,
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

export const getTradeRate = (
  input: NearIntentsTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<TradeRate[], SwapErrorRight>> => getRate(input, deps)

export const getExactOutputTradeRate = (
  input: NearIntentsExactOutputTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<TradeRate[], SwapErrorRight>> => getRate(input, deps)
