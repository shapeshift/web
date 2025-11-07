import { bn } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type { GetTradeRateInput, SwapErrorRight, SwapperDeps, TradeRate } from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { DEFAULT_QUOTE_DEADLINE_MS } from '../constants'
import type { QuoteRequest, QuoteResponse } from '../types'
import { NEAR_INTENTS_DUMMY_ADDRESS } from '../types'
import { assetToNearIntentsId, convertSlippageToBps } from '../utils/helpers/helpers'
import { initializeOneClickService, OneClickService } from '../utils/oneClickService'

export const getTradeRate = async (
  input: GetTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<TradeRate[], SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmount,
    slippageTolerancePercentageDecimal,
    affiliateBps,
    receiveAddress,
  } = input

  try {
    // Initialize 1Click SDK with API key
    const apiKey = deps.config.VITE_NEAR_INTENTS_API_KEY
    initializeOneClickService(apiKey)

    // Convert assets to NEAR Intents format
    const originAsset = assetToNearIntentsId(sellAsset)
    const destinationAsset = assetToNearIntentsId(buyAsset)

    // Use dummy address for rates (no wallet connected yet)
    const dummyAddress = receiveAddress ?? NEAR_INTENTS_DUMMY_ADDRESS

    const quoteRequest: QuoteRequest = {
      dry: true,
      swapType: QuoteRequest.swapType.EXACT_INPUT,
      slippageTolerance: convertSlippageToBps(slippageTolerancePercentageDecimal),
      originAsset,
      destinationAsset,
      amount: sellAmount,
      depositType: QuoteRequest.depositType.ORIGIN_CHAIN,
      refundTo: dummyAddress,
      refundType: QuoteRequest.refundType.ORIGIN_CHAIN,
      recipient: dummyAddress,
      recipientType: QuoteRequest.recipientType.DESTINATION_CHAIN,
      deadline: new Date(Date.now() + DEFAULT_QUOTE_DEADLINE_MS).toISOString(),
      // TODO(gomes): Implement affiliate fees when NEAR address confirmed for fee recipient
      // CRITICAL: appFees.recipient ONLY accepts NEAR addresses (e.g., "alice.near")
      // Cannot use EVM treasury addresses here - fees must be collected on NEAR
      // appFees: [
      //   {
      //     recipient: 'shapeshift.near', // Need to create this NEAR account
      //     fee_bps: Number(affiliateBps), // '55' from app
      //   }
      // ],
    }

    // Call 1Click API to get rate (dry run)
    const quoteResponse: QuoteResponse = await OneClickService.getQuote(quoteRequest)

    const { quote } = quoteResponse

    // Build TradeRate response
    const tradeRate: TradeRate = {
      id: uuid(),
      receiveAddress: receiveAddress ?? undefined,
      affiliateBps,
      rate: bn(quote.amountOut).div(quote.amountIn).toString(),
      slippageTolerancePercentageDecimal:
        slippageTolerancePercentageDecimal ??
        getDefaultSlippageDecimalPercentageForSwapper(SwapperName.NearIntents),
      quoteOrRate: 'rate' as const,
      swapperName: SwapperName.NearIntents,
      steps: [
        {
          accountNumber: undefined,
          allowanceContract: '',
          buyAmountBeforeFeesCryptoBaseUnit: quote.amountOut,
          buyAmountAfterFeesCryptoBaseUnit: quote.amountOut,
          buyAsset,
          feeData: {
            protocolFees: {},
            networkFeeCryptoBaseUnit: '0',
          },
          rate: bn(quote.amountOut).div(quote.amountIn).toString(),
          sellAmountIncludingProtocolFeesCryptoBaseUnit: quote.amountIn,
          sellAsset,
          source: SwapperName.NearIntents,
          estimatedExecutionTimeMs: quote.timeEstimate ? quote.timeEstimate * 1000 : undefined,
        },
      ],
    }

    return Ok([tradeRate])
  } catch (error) {
    return Err(
      makeSwapErrorRight({
        message: error instanceof Error ? error.message : 'Unknown error getting NEAR Intents rate',
        code: TradeQuoteError.QueryFailed,
        cause: error,
      }),
    )
  }
}
