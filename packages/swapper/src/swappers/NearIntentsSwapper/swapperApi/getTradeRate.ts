import { bn } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type { GetTradeRateInput, SwapErrorRight, SwapperDeps, TradeRate } from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { DEFAULT_QUOTE_DEADLINE_MS } from '../constants'
import type { QuoteResponse } from '../types'
import { QuoteRequest } from '../types'
import { assetToNearIntentsAsset, convertSlippageToBps } from '../utils/helpers/helpers'
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
    sendAddress,
    receiveAddress,
  } = input

  try {
    const apiKey = deps.config.VITE_NEAR_INTENTS_API_KEY
    initializeOneClickService(apiKey)

    const originAsset = await assetToNearIntentsAsset(sellAsset)
    const destinationAsset = await assetToNearIntentsAsset(buyAsset)

    // Wallet connected: use actual addresses
    // No wallet: use "check-price" sentinel with INTENTS types
    const hasWallet = sendAddress !== undefined

    const quoteRequest: QuoteRequest = {
      dry: true,
      swapType: QuoteRequest.swapType.EXACT_INPUT,
      slippageTolerance: convertSlippageToBps(slippageTolerancePercentageDecimal),
      originAsset,
      destinationAsset,
      amount: sellAmount,
      depositType: QuoteRequest.depositType.ORIGIN_CHAIN,
      refundTo: sendAddress ?? 'check-price',
      refundType: hasWallet
        ? QuoteRequest.refundType.ORIGIN_CHAIN
        : QuoteRequest.refundType.INTENTS,
      recipient: receiveAddress ?? 'check-price',
      recipientType: hasWallet
        ? QuoteRequest.recipientType.DESTINATION_CHAIN
        : QuoteRequest.recipientType.INTENTS,
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
