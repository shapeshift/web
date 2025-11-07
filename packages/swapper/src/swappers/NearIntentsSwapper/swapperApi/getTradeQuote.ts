// NEAR Intents 1Click API integration
// API Spec: https://docs.near-intents.org/near-intents/integration/distribution-channels/1click-api#api-specification-v0
// Brand: https://pages.near.org/about/brand/

import { CHAIN_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import type { GetFeeDataInput } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { bn, isToken } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type { CommonTradeQuoteInput, SwapErrorRight, SwapperDeps, TradeQuote } from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { DEFAULT_QUOTE_DEADLINE_MS } from '../constants'
import type { QuoteResponse } from '../types'
import { QuoteRequest } from '../types'
import { assetToNearIntentsAsset, convertSlippageToBps } from '../utils/helpers/helpers'
import { initializeOneClickService, OneClickService } from '../utils/oneClickService'

export const getTradeQuote = async (
  input: CommonTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  console.log('[NEAR Intents] getTradeQuote called')
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

  // Validate required fields
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
    // Initialize 1Click SDK with API key
    const apiKey = deps.config.VITE_NEAR_INTENTS_API_KEY
    initializeOneClickService(apiKey)

    console.log('[NEAR Intents] Converting assets')
    const originAsset = await assetToNearIntentsAsset(sellAsset)
    const destinationAsset = await assetToNearIntentsAsset(buyAsset)
    console.log('[NEAR Intents] Assets:', { originAsset, destinationAsset })

    const quoteRequest: QuoteRequest = {
      dry: false,
      swapType: QuoteRequest.swapType.EXACT_INPUT,
      slippageTolerance: convertSlippageToBps(slippageTolerancePercentageDecimal),
      originAsset,
      destinationAsset,
      amount: sellAmount,
      depositType: QuoteRequest.depositType.ORIGIN_CHAIN,
      refundTo: sendAddress,
      refundType: QuoteRequest.refundType.ORIGIN_CHAIN,
      recipient: receiveAddress,
      recipientType: QuoteRequest.recipientType.DESTINATION_CHAIN,
      deadline: new Date(Date.now() + DEFAULT_QUOTE_DEADLINE_MS).toISOString(),
      // TODO: Add affiliate fees when NEAR account created - https://github.com/shapeshift/web/issues/11022
      // appFees: [{
      //   recipient: 'shapeshift.near',
      //   fee_bps: Number(affiliateBps),
      // }],
    }

    // Call 1Click API to get quote with deposit address
    console.log('[NEAR Intents] Calling API')
    const quoteResponse: QuoteResponse = await OneClickService.getQuote(quoteRequest)
    console.log('[NEAR Intents] API success')

    const { quote } = quoteResponse

    if (!quote.depositAddress) {
      throw new Error('Missing deposit address in quote response')
    }

    // Get fee data for the deposit transaction
    const { chainNamespace } = fromAssetId(sellAsset.assetId)
    console.log('[NEAR Intents] Chain namespace:', chainNamespace)

    let feeDataPromise: Promise<string>

    switch (chainNamespace) {
      case CHAIN_NAMESPACE.Evm: {
        const sellAdapter = deps.assertGetEvmChainAdapter(sellAsset.chainId)
        feeDataPromise = sellAdapter
          .getFeeData({
            to: quote.depositAddress,
            value: sellAmount,
            chainSpecific: {
              from: sendAddress,
              data: '0x',
            },
            sendMax: false,
          })
          .then(feeData => feeData.fast.txFee)
        break
      }

      case CHAIN_NAMESPACE.Utxo: {
        const sellAdapter = deps.assertGetUtxoChainAdapter(sellAsset.chainId)
        feeDataPromise = sellAdapter
          .getFeeData({
            to: quote.depositAddress,
            value: sellAmount,
            chainSpecific: { from: sendAddress, pubkey: sendAddress },
            sendMax: false,
          })
          .then(feeData => feeData.fast.txFee)
        break
      }

      case CHAIN_NAMESPACE.Solana: {
        console.log('[NEAR Intents] Getting Solana fee data')
        const sellAdapter = deps.assertGetSolanaChainAdapter(sellAsset.chainId)
        const tokenId = isToken(sellAsset.assetId)
          ? fromAssetId(sellAsset.assetId).assetReference
          : undefined
        const getFeeDataInput: GetFeeDataInput<KnownChainIds.SolanaMainnet> = {
          to: quote.depositAddress,
          value: sellAmount,
          chainSpecific: {
            from: sendAddress,
            tokenId,
          },
          sendMax: false,
        }
        feeDataPromise = sellAdapter.getFeeData(getFeeDataInput).then(feeData => feeData.fast.txFee)
        break
      }

      default:
        return Err(
          makeSwapErrorRight({
            message: `Unsupported chain namespace: ${chainNamespace}`,
            code: TradeQuoteError.UnsupportedChain,
          }),
        )
    }

    console.log('[NEAR Intents] Awaiting fee data')
    const networkFeeCryptoBaseUnit = await feeDataPromise
    console.log('[NEAR Intents] Fee data received:', networkFeeCryptoBaseUnit)

    // Build TradeQuote response
    const tradeQuote: TradeQuote = {
      id: uuid(),
      receiveAddress,
      affiliateBps,
      rate: bn(quote.amountOut).div(quote.amountIn).toString(),
      slippageTolerancePercentageDecimal:
        slippageTolerancePercentageDecimal ??
        getDefaultSlippageDecimalPercentageForSwapper(SwapperName.NearIntents),
      quoteOrRate: 'quote' as const,
      swapperName: SwapperName.NearIntents,
      steps: [
        {
          accountNumber,
          // Use deposit address as allowance contract (not a real allowance, but required field)
          allowanceContract: quote.depositAddress,
          buyAmountBeforeFeesCryptoBaseUnit: quote.amountOut,
          buyAmountAfterFeesCryptoBaseUnit: quote.amountOut,
          buyAsset,
          feeData: {
            protocolFees: {},
            networkFeeCryptoBaseUnit,
          },
          rate: bn(quote.amountOut).div(quote.amountIn).toString(),
          sellAmountIncludingProtocolFeesCryptoBaseUnit: quote.amountIn,
          sellAsset,
          source: SwapperName.NearIntents,
          estimatedExecutionTimeMs: quote.timeEstimate ? quote.timeEstimate * 1000 : undefined,
          // Store NEAR Intents specific data for execution and status polling
          nearIntentsSpecific: {
            depositAddress: quote.depositAddress ?? '',
            depositMemo: quote.depositMemo,
            timeEstimate: quote.timeEstimate,
            deadline: quote.deadline ?? '',
          },
        },
      ],
    }

    console.log('[NEAR Intents] Returning quote')
    return Ok([tradeQuote])
  } catch (error) {
    console.error('[NEAR Intents] getTradeQuote error:', error)
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
