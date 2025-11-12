import { CHAIN_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import { bn, bnOrZero, isToken } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type { CommonTradeQuoteInput, SwapErrorRight, SwapperDeps, TradeQuote } from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { DEFAULT_QUOTE_DEADLINE_MS, DEFAULT_SLIPPAGE_BPS } from '../constants'
import type { QuoteResponse } from '../types'
import { QuoteRequest } from '../types'
import { assetToNearIntentsAsset, calculateAccountCreationCosts } from '../utils/helpers/helpers'
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

  const from = sendAddress

  try {
    initializeOneClickService(deps.config.VITE_NEAR_INTENTS_API_KEY)

    const originAsset = await assetToNearIntentsAsset(sellAsset)
    const destinationAsset = await assetToNearIntentsAsset(buyAsset)

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
      deadline: new Date(Date.now() + DEFAULT_QUOTE_DEADLINE_MS).toISOString(),
      // TODO(gomes): appFees disabled - https://github.com/shapeshift/web/issues/11022
    }

    const quoteResponse: QuoteResponse = await OneClickService.getQuote(quoteRequest)

    const { quote } = quoteResponse

    if (!quote.depositAddress) {
      throw new Error('Missing deposit address in quote response')
    }

    const { chainNamespace } = fromAssetId(sellAsset.assetId)
    const depositAddress = quote.depositAddress

    const getFeeData = async (): Promise<{
      networkFeeCryptoBaseUnit: string
      chainSpecific?: { satsPerByte: string }
    }> => {
      switch (chainNamespace) {
        case CHAIN_NAMESPACE.Evm: {
          const sellAdapter = deps.assertGetEvmChainAdapter(sellAsset.chainId)
          const feeData = await sellAdapter.getFeeData({
            to: depositAddress,
            value: sellAmount,
            chainSpecific: {
              from,
              data: '0x',
            },
            sendMax: false,
          })
          return { networkFeeCryptoBaseUnit: feeData.fast.txFee }
        }

        case CHAIN_NAMESPACE.Utxo: {
          const sellAdapter = deps.assertGetUtxoChainAdapter(sellAsset.chainId)
          const xpub = 'xpub' in input ? input.xpub : undefined

          if (!xpub) {
            throw new Error('xpub is required for UTXO fee estimation')
          }

          const feeData = await sellAdapter.getFeeData({
            to: depositAddress,
            value: sellAmount,
            chainSpecific: { pubkey: xpub },
            sendMax: false,
          })
          return {
            networkFeeCryptoBaseUnit: feeData.fast.txFee,
            chainSpecific: {
              satsPerByte: feeData.fast.chainSpecific.satoshiPerByte,
            },
          }
        }

        case CHAIN_NAMESPACE.Solana: {
          const sellAdapter = deps.assertGetSolanaChainAdapter(sellAsset.chainId)
          const tokenId = isToken(sellAsset.assetId)
            ? fromAssetId(sellAsset.assetId).assetReference
            : undefined

          const instructions = await sellAdapter.buildEstimationInstructions({
            from,
            to: depositAddress,
            tokenId,
            value: sellAmount,
          })

          const feeData = await sellAdapter.getFeeData({
            to: depositAddress,
            value: sellAmount,
            chainSpecific: {
              from,
              tokenId,
              instructions,
            },
            sendMax: false,
          })

          const txFee = feeData.fast.txFee
          const ataCreationCost = calculateAccountCreationCosts(instructions)
          const totalFee = bn(txFee).plus(ataCreationCost).toString()

          return { networkFeeCryptoBaseUnit: totalFee }
        }

        default:
          throw new Error(`Unsupported chain namespace: ${chainNamespace}`)
      }
    }

    const { networkFeeCryptoBaseUnit, chainSpecific } = await getFeeData()

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
          allowanceContract: quote.depositAddress,
          buyAmountBeforeFeesCryptoBaseUnit: quote.amountOut,
          buyAmountAfterFeesCryptoBaseUnit: quote.amountOut,
          buyAsset,
          feeData: {
            protocolFees: {},
            networkFeeCryptoBaseUnit,
            ...(chainSpecific && { chainSpecific }),
          },
          rate: bn(quote.amountOut).div(quote.amountIn).toString(),
          sellAmountIncludingProtocolFeesCryptoBaseUnit: quote.amountIn,
          sellAsset,
          source: SwapperName.NearIntents,
          estimatedExecutionTimeMs: quote.timeEstimate ? quote.timeEstimate * 1000 : undefined,
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
