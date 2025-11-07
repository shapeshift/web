// NEAR Intents 1Click API integration
// API Spec: https://docs.near-intents.org/near-intents/integration/distribution-channels/1click-api#api-specification-v0
// Brand: https://pages.near.org/about/brand/

import { CHAIN_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import type { GetFeeDataInput } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { bn } from '@shapeshiftoss/utils'
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
import { assetToNearIntentsId, convertSlippageToBps } from '../utils/helpers/helpers'
import { initializeOneClickService, OneClickService } from '../utils/oneClickService'

export const getTradeQuote = async (
  input: CommonTradeQuoteInput,
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

    // Convert assets to NEAR Intents format
    const originAsset = assetToNearIntentsId(sellAsset)
    const destinationAsset = assetToNearIntentsId(buyAsset)

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

    // Call 1Click API to get quote with deposit address
    const quoteResponse: QuoteResponse = await OneClickService.getQuote(quoteRequest)

    const { quote } = quoteResponse

    if (!quote.depositAddress) {
      throw new Error('Missing deposit address in quote response')
    }

    // Get fee data for the deposit transaction
    const { chainNamespace } = fromAssetId(sellAsset.assetId)

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
        const sellAdapter = deps.assertGetSolanaChainAdapter(sellAsset.chainId)
        const getFeeDataInput: GetFeeDataInput<KnownChainIds.SolanaMainnet> = {
          to: quote.depositAddress,
          value: sellAmount,
          chainSpecific: {
            from: sendAddress,
            tokenId: sellAsset.assetId,
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

    const networkFeeCryptoBaseUnit = await feeDataPromise

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

    return Ok([tradeQuote])
  } catch (error) {
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
