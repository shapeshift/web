// NEAR Intents 1Click API integration
// API Spec: https://docs.near-intents.org/near-intents/integration/distribution-channels/1click-api#api-specification-v0
// Brand: https://pages.near.org/about/brand/

import { CHAIN_NAMESPACE, fromAssetId } from '@shapeshiftoss/caip'
import { bn, bnOrZero, isToken } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { TransactionInstruction } from '@solana/web3.js'
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

// Associated Token Program ID for ATA creation detection
const ASSOCIATED_TOKEN_PROGRAM_ID = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'
// ATA rent-exempt minimum (slightly higher than exact 2,039,280 for safety margin)
const ATA_RENT_LAMPORTS = 2040000

// Calculate total cost of ATA creation from instructions (similar to Jupiter's approach)
const calculateAccountCreationCosts = (instructions: TransactionInstruction[]): string => {
  let totalCost = bnOrZero(0)

  for (const ix of instructions) {
    const programId = ix.programId.toString()

    // Check if this is an Associated Token Program instruction
    if (programId === ASSOCIATED_TOKEN_PROGRAM_ID) {
      // ATA creation instructions from the ATA program always require rent
      // The presence of the instruction itself indicates account creation
      totalCost = totalCost.plus(ATA_RENT_LAMPORTS)
    }
  }

  return totalCost.toString()
}

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

    const originAsset = await assetToNearIntentsAsset(sellAsset)
    const destinationAsset = await assetToNearIntentsAsset(buyAsset)

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
    const quoteResponse: QuoteResponse = await OneClickService.getQuote(quoteRequest)

    const { quote } = quoteResponse

    if (!quote.depositAddress) {
      throw new Error('Missing deposit address in quote response')
    }

    // Get fee data for the deposit transaction
    const { chainNamespace } = fromAssetId(sellAsset.assetId)

    const getFeeData = async (): Promise<{
      networkFeeCryptoBaseUnit: string
      chainSpecific?: { satsPerByte: string }
    }> => {
      switch (chainNamespace) {
        case CHAIN_NAMESPACE.Evm: {
          const sellAdapter = deps.assertGetEvmChainAdapter(sellAsset.chainId)
          const feeData = await sellAdapter.getFeeData({
            to: quote.depositAddress,
            value: sellAmount,
            chainSpecific: {
              from: sendAddress,
              data: '0x',
            },
            sendMax: false,
          })
          return { networkFeeCryptoBaseUnit: feeData.fast.txFee }
        }

        case CHAIN_NAMESPACE.Utxo: {
          const sellAdapter = deps.assertGetUtxoChainAdapter(sellAsset.chainId)
          const feeData = await sellAdapter.getFeeData({
            to: quote.depositAddress,
            value: sellAmount,
            chainSpecific: { from: sendAddress, pubkey: sendAddress },
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

          // Build estimation instructions to check for ATA creation needs
          const instructions = await sellAdapter.buildEstimationInstructions({
            from: sendAddress,
            to: quote.depositAddress,
            tokenId,
            value: sellAmount,
          })

          const feeData = await sellAdapter.getFeeData({
            to: quote.depositAddress,
            value: sellAmount,
            chainSpecific: {
              from: sendAddress,
              tokenId,
              instructions, // Pass instructions so getFeeData uses them
            },
            sendMax: false,
          })

          // Get transaction fee and add ATA creation costs (like Jupiter does)
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
            ...(chainSpecific && { chainSpecific }),
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
