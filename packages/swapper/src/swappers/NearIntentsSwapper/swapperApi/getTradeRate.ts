import { nearChainId } from '@shapeshiftoss/caip'
import { bnOrZero, chainIdToFeeAssetId, DAO_TREASURY_NEAR } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type { GetTradeRateInput, SwapErrorRight, SwapperDeps, TradeRate } from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import {
  createTradeAmountTooSmallErr,
  getInputOutputRate,
  makeSwapErrorRight,
} from '../../../utils'
import { buildAffiliateFee } from '../../utils/affiliateFee'
import { DEFAULT_QUOTE_DEADLINE_MS, DEFAULT_SLIPPAGE_BPS } from '../constants'
import type { QuoteResponse } from '../types'
import { QuoteRequest } from '../types'
import { getNearIntentsRateNetworkFeeCryptoBaseUnit } from '../utils/getNearIntentsStepData'
import { assetToNearIntentsAsset } from '../utils/helpers'
import { ApiError, initializeOneClickService, OneClickService } from '../utils/oneClickService'

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

    // Wallet connected: use actual addresses
    // No wallet: use "check-price" sentinel with INTENTS types
    const hasWallet = sendAddress !== undefined

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
      refundTo: sendAddress ?? 'check-price',
      refundType: hasWallet
        ? QuoteRequest.refundType.ORIGIN_CHAIN
        : QuoteRequest.refundType.INTENTS,
      recipient: receiveAddress ?? 'check-price',
      recipientType: hasWallet
        ? QuoteRequest.recipientType.DESTINATION_CHAIN
        : QuoteRequest.recipientType.INTENTS,
      deadline: new Date(Date.now() + DEFAULT_QUOTE_DEADLINE_MS).toISOString(),
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

    const networkFeeCryptoBaseUnit = await (async () => {
      try {
        const networkFeeCryptoBaseUnit = await getNearIntentsRateNetworkFeeCryptoBaseUnit({
          type: 'rate',
          deps,
          input,
          sellAsset,
          sellAmountCryptoBaseUnit: sellAmount,
          sendAddress,
          depositAddress,
        })
        return networkFeeCryptoBaseUnit ?? '0'
      } catch (error) {
        console.error('Failed to estimate NEAR Intents rate network fee:', error)
        return '0'
      }
    })()

    const rate = getInputOutputRate({
      sellAmountCryptoBaseUnit: quote.amountIn,
      buyAmountCryptoBaseUnit: quote.amountOut,
      sellAsset,
      buyAsset,
    })

    const tradeRate: TradeRate = {
      id: uuid(),
      receiveAddress: receiveAddress ?? undefined,
      affiliateBps,
      rate,
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
            networkFeeCryptoBaseUnit,
          },
          rate,
          sellAmountIncludingProtocolFeesCryptoBaseUnit: quote.amountIn,
          sellAsset,
          source: SwapperName.NearIntents,
          estimatedExecutionTimeMs: quote.timeEstimate ? quote.timeEstimate * 1000 : undefined,
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

    return Ok([tradeRate])
  } catch (error) {
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
        message: error instanceof Error ? error.message : 'Unknown error getting NEAR Intents rate',
        code: TradeQuoteError.QueryFailed,
        cause: error,
      }),
    )
  }
}
