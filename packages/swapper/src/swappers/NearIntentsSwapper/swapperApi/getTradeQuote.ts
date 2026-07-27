import { btcChainId, nearChainId } from '@shapeshiftoss/caip'
import { bnOrZero, chainIdToFeeAssetId, DAO_TREASURY_NEAR } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type { GetTradeQuoteInput, SwapErrorRight, SwapperDeps, TradeQuote } from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import {
  createTradeAmountTooSmallErr,
  getInputOutputRate,
  makeSwapErrorRight,
} from '../../../utils'
import { buildAffiliateFee } from '../../../utils/affiliateFee'
import {
  BTC_QUOTE_DEADLINE_MS,
  DEFAULT_QUOTE_DEADLINE_MS,
  DEFAULT_SLIPPAGE_BPS,
} from '../constants'
import type { QuoteResponse } from '../types'
import { QuoteRequest } from '../types'
import { getNearIntentsStepData } from '../utils/getNearIntentsStepData'
import { assetToNearIntentsAsset } from '../utils/helpers'
import { ApiError, initializeOneClickService, OneClickService } from '../utils/oneClickService'

export const getTradeQuote = async (
  input: GetTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset,
    accountNumber,
    sendAddress,
    receiveAddress,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmount,
    slippageTolerancePercentageDecimal,
    affiliateBps,
  } = input

  if (accountNumber === undefined) {
    return Err(
      makeSwapErrorRight({
        message: `accountNumber is required`,
        code: TradeQuoteError.UnknownError,
      }),
    )
  }

  if (sendAddress === undefined) {
    return Err(
      makeSwapErrorRight({
        message: `sendAddress is required`,
        code: TradeQuoteError.UnknownError,
      }),
    )
  }

  if (receiveAddress === undefined) {
    return Err(
      makeSwapErrorRight({
        message: `receiveAddress is required`,
        code: TradeQuoteError.UnknownError,
      }),
    )
  }

  try {
    initializeOneClickService(deps.config.VITE_NEAR_INTENTS_API_KEY)

    const originAsset = await assetToNearIntentsAsset(sellAsset)
    const destinationAsset = await assetToNearIntentsAsset(buyAsset)

    if (!originAsset) {
      return Err(
        makeSwapErrorRight({
          code: TradeQuoteError.UnsupportedTradePair,
          message: `Asset ${sellAsset.symbol} on ${
            sellAsset.networkName || sellAsset.chainId
          } is not supported by NEAR Intents`,
        }),
      )
    }

    if (!destinationAsset) {
      return Err(
        makeSwapErrorRight({
          code: TradeQuoteError.UnsupportedTradePair,
          message: `Asset ${buyAsset.symbol} on ${
            buyAsset.networkName || buyAsset.chainId
          } is not supported by NEAR Intents`,
        }),
      )
    }

    const quoteDeadline =
      sellAsset.chainId === btcChainId || buyAsset.chainId === btcChainId
        ? BTC_QUOTE_DEADLINE_MS
        : DEFAULT_QUOTE_DEADLINE_MS

    const quoteRequest: QuoteRequest = {
      dry: false,
      swapType: QuoteRequest.swapType.EXACT_INPUT,
      slippageTolerance: slippageTolerancePercentageDecimal
        ? bnOrZero(slippageTolerancePercentageDecimal).times(10000).toNumber()
        : DEFAULT_SLIPPAGE_BPS,
      originAsset,
      destinationAsset,
      amount: sellAmount,
      depositType: QuoteRequest.depositType.ORIGIN_CHAIN,
      refundTo: sendAddress,
      refundType: QuoteRequest.refundType.ORIGIN_CHAIN,
      recipient: receiveAddress,
      recipientType: QuoteRequest.recipientType.DESTINATION_CHAIN,
      deadline: new Date(Date.now() + quoteDeadline).toISOString(),
      referral: 'shapeshift',
      appFees: [
        {
          recipient: DAO_TREASURY_NEAR,
          fee: Number(affiliateBps),
        },
      ],
    }

    const maxRetries = 3
    let quoteResponse: QuoteResponse | null = null
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        quoteResponse = await OneClickService.getQuote(quoteRequest)
        break
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        const isWebSocketError = lastError.message.includes('WebSocket is not ready')

        if (isWebSocketError && attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
          continue
        }
        throw lastError
      }
    }

    if (!quoteResponse) {
      throw lastError ?? new Error('Failed to get quote after retries')
    }

    const { quote } = quoteResponse

    if (!quote.depositAddress) {
      throw new Error('Missing deposit address in quote response')
    }

    const depositAddress = quote.depositAddress

    const { networkFeeCryptoBaseUnit, transactionData } = await getNearIntentsStepData({
      type: 'quote',
      deps,
      input,
      sellAsset,
      sellAmountCryptoBaseUnit: sellAmount,
      from: sendAddress,
      depositAddress,
    })

    const rate = getInputOutputRate({
      sellAmountCryptoBaseUnit: quote.amountIn,
      buyAmountCryptoBaseUnit: quote.amountOut,
      sellAsset,
      buyAsset,
    })

    const tradeQuote: TradeQuote = {
      id: uuid(),
      receiveAddress,
      affiliateBps,
      rate,
      slippageTolerancePercentageDecimal:
        slippageTolerancePercentageDecimal ??
        getDefaultSlippageDecimalPercentageForSwapper(SwapperName.NearIntents),
      quoteOrRate: 'quote' as const,
      swapperName: SwapperName.NearIntents,
      steps: [
        {
          accountNumber,
          allowanceContract: '',
          buyAmountBeforeFeesCryptoBaseUnit: quote.amountOut,
          buyAmountAfterFeesCryptoBaseUnit: quote.amountOut,
          buyAsset,
          feeData: {
            protocolFees: {},
            networkFeeCryptoBaseUnit,
          },
          rate,
          sellAmountIncludingProtocolFeesCryptoBaseUnit: quote.amountIn,
          sellAsset,
          source: SwapperName.NearIntents,
          estimatedExecutionTimeMs: quote.timeEstimate ? quote.timeEstimate * 1000 : undefined,
          transactionData,
          swapperMetadata: {
            name: 'nearIntents',
            depositAddress: quote.depositAddress ?? '',
            depositMemo: quote.depositMemo,
            timeEstimate: quote.timeEstimate,
            deadline: quote.deadline ?? '',
          },
          affiliateFee: buildAffiliateFee({
            strategy: 'fixed_asset',
            affiliateBps,
            sellAsset,
            buyAsset,
            sellAmountCryptoBaseUnit: quote.amountIn,
            buyAmountCryptoBaseUnit: quote.amountOut,
            fixedAssetId: chainIdToFeeAssetId(nearChainId),
            fixedAsset: deps.assetsById[chainIdToFeeAssetId(nearChainId)],
            isEstimate: true,
          }),
        },
      ],
    }

    return Ok([tradeQuote])
  } catch (error) {
    console.error('[NEAR Intents] getTradeQuote error:', error)

    if (error instanceof ApiError) {
      if (
        error.body?.message === 'tokenIn is not valid' ||
        error.body?.message === 'tokenOut is not valid'
      ) {
        return Err(
          makeSwapErrorRight({
            code: TradeQuoteError.UnsupportedTradePair,
            message: 'Unsupported asset',
          }),
        )
      }

      if (error.body?.message?.includes('Amount is too low')) {
        const match = error.body.message.match(/try at least (\d+)/)
        if (match) {
          const minAmountCryptoBaseUnit = match[1]
          return Err(
            createTradeAmountTooSmallErr({
              minAmountCryptoBaseUnit,
              assetId: sellAsset.assetId,
            }),
          )
        }
      }
    }

    return Err(
      makeSwapErrorRight({
        message:
          error instanceof Error ? error.message : 'Unknown error getting NEAR Intents quote',
        code: TradeQuoteError.QueryFailed,
        cause: error,
      }),
    )
  }
}
