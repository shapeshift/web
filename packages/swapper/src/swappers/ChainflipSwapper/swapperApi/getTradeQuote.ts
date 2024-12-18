import { CHAIN_NAMESPACE, fromAssetId, solAssetId } from '@shapeshiftoss/caip'
import type { GetFeeDataInput } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { AxiosError } from 'axios'

import type {
  CommonTradeQuoteInput,
  QuoteFeeData,
  SwapErrorRight,
  SwapperDeps,
  TradeQuote,
  TradeQuoteStep,
} from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { CHAINFLIP_BAAS_COMMISSION } from '../constants'
import { getQuoteOrRate } from '../utils/getQuoteOrRate'
import {
  calculateChainflipMinPrice,
  getChainFlipIdFromAssetId,
  getChainFlipSwap,
} from '../utils/helpers'

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

  const maybeTradeQuotes = await getQuoteOrRate(input, deps)

  if (maybeTradeQuotes.isErr()) return Err(maybeTradeQuotes.unwrapErr())

  const brokerUrl = deps.config.REACT_APP_CHAINFLIP_API_URL
  const apiKey = deps.config.REACT_APP_CHAINFLIP_API_KEY

  const tradeQuotes = maybeTradeQuotes.unwrap()

  // We need to open a deposit channel at this point to attach the swap id to the quote,
  // in order to properly fetch the streaming status later
  for (const tradeQuote of tradeQuotes) {
    for (const step of tradeQuote.steps) {
      const sourceAsset = await getChainFlipIdFromAssetId({
        assetId: sellAsset.assetId,
        brokerUrl,
      })
      const destinationAsset = await getChainFlipIdFromAssetId({
        assetId: buyAsset.assetId,
        brokerUrl,
      })

      const minimumPrice = calculateChainflipMinPrice({
        slippageTolerancePercentageDecimal: tradeQuote.slippageTolerancePercentageDecimal,
        sellAsset,
        buyAsset,
        buyAmountAfterFeesCryptoBaseUnit: step.buyAmountAfterFeesCryptoBaseUnit,
        sellAmountIncludingProtocolFeesCryptoBaseUnit:
          step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      })

      let serviceCommission = parseInt(tradeQuote.affiliateBps) - CHAINFLIP_BAAS_COMMISSION
      if (serviceCommission < 0) serviceCommission = 0

      const maybeSwapResponse = await getChainFlipSwap({
        brokerUrl,
        apiKey,
        sourceAsset,
        minimumPrice,
        destinationAsset,
        destinationAddress: input.receiveAddress,
        refundAddress: input.sendAddress!,
        maxBoostFee: step.chainflipSpecific?.chainflipMaxBoostFee,
        numberOfChunks: step.chainflipSpecific?.chainflipNumberOfChunks,
        chunkIntervalBlocks: step.chainflipSpecific?.chainflipChunkIntervalBlocks,
        commissionBps: serviceCommission,
      })

      if (maybeSwapResponse.isErr()) {
        const error = maybeSwapResponse.unwrapErr()
        const cause = error.cause as AxiosError<any, any>
        throw Error(cause.response!.data.detail)
      }

      const { data: swapResponse } = maybeSwapResponse.unwrap()

      if (!swapResponse.id) throw Error('Missing Swap Id')
      if (!swapResponse.address) throw Error('Missing Deposit Channel')

      const depositAddress = swapResponse.address

      const getFeeData = async () => {
        const { chainNamespace } = fromAssetId(sellAsset.assetId)

        // We faked feeData for Solana with a self-send during rates, we can now properly do it on quote time
        switch (chainNamespace) {
          case CHAIN_NAMESPACE.Solana: {
            const sellAdapter = deps.assertGetSolanaChainAdapter(sellAsset.chainId)
            const getFeeDataInput: GetFeeDataInput<KnownChainIds.SolanaMainnet> = {
              to: depositAddress,
              value: sellAmount,
              chainSpecific: {
                from: input.sendAddress!,
                tokenId:
                  sellAsset.assetId === solAssetId
                    ? undefined
                    : fromAssetId(sellAsset.assetId).assetReference,
              },
            }
            const { fast } = await sellAdapter.getFeeData(getFeeDataInput)
            return {
              protocolFees: step.feeData.protocolFees,
              networkFeeCryptoBaseUnit: fast.txFee,
            } as QuoteFeeData
          }

          default:
            return step.feeData
        }
      }

      if (!step.chainflipSpecific)
        step.chainflipSpecific = {
          chainflipSwapId: swapResponse.id,
          chainflipDepositAddress: depositAddress,
        }

      step.chainflipSpecific.chainflipSwapId = swapResponse.id
      step.chainflipSpecific.chainflipDepositAddress = swapResponse.address
      step.feeData = await getFeeData()
    }
  }

  const quotesResult = Ok(tradeQuotes)

  return quotesResult.map(quotes =>
    quotes.map(quote => ({
      ...quote,
      quoteOrRate: 'quote' as const,
      receiveAddress: receiveAddress!,
      steps: quote.steps.map(step => step) as [TradeQuoteStep] | [TradeQuoteStep, TradeQuoteStep],
    })),
  )
}
