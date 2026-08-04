import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight, SwapperDeps, TradeQuote } from '../../../types'
import { assertQuoteAddresses } from '../../../utils'
import type { NearIntentsTradeQuoteInput } from '../types'
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

export const getTradeQuote = async (
  input: NearIntentsTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset,
    accountNumber,
    affiliateBps,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmount,
  } = input

  const addresses = assertQuoteAddresses(input)
  if (addresses.isErr()) return Err(addresses.unwrapErr())
  const { sendAddress, receiveAddress } = addresses.unwrap()

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
    refundTo: sendAddress,
    recipient: receiveAddress,
    refundType: QuoteRequest.refundType.ORIGIN_CHAIN,
    recipientType: QuoteRequest.recipientType.DESTINATION_CHAIN,
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
    type: 'quote',
    input,
    from: sendAddress,
  })

  if (maybeStepData.isErr()) return Err(maybeStepData.unwrapErr())
  const { transactionData, networkFeeCryptoBaseUnit } = maybeStepData.unwrap()

  const tradeQuote: TradeQuote = {
    ...tradeCommon,
    quoteOrRate: 'quote' as const,
    receiveAddress,
    steps: [
      {
        ...stepCommon,
        accountNumber,
        transactionData,
        feeData: { protocolFees, networkFeeCryptoBaseUnit },
        swapperMetadata: {
          name: 'nearIntents',
          depositAddress: quote.depositAddress ?? '',
          depositMemo: quote.depositMemo,
        },
      },
    ],
  }

  return Ok([tradeQuote])
}
