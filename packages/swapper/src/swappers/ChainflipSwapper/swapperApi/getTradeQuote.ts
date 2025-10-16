import { CHAIN_NAMESPACE, fromAssetId, solAssetId } from '@shapeshiftoss/caip'
import type { GetFeeDataInput } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { isSome } from '@shapeshiftoss/utils'
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

  const brokerUrl = deps.config.VITE_CHAINFLIP_API_URL
  const apiKey = deps.config.VITE_CHAINFLIP_API_KEY

  const tradeQuotes = maybeTradeQuotes.unwrap()

  // We need to open a deposit channel at this point to attach the swap id to the quote,
  // in order to properly fetch the streaming status later
  for (const tradeQuote of tradeQuotes) {
    for (const step of tradeQuote.steps) {
      const maybeSourceAsset = await getChainFlipIdFromAssetId({
        assetId: sellAsset.assetId,
        brokerUrl,
      })
      const maybeDestinationAsset = await getChainFlipIdFromAssetId({
        assetId: buyAsset.assetId,
        brokerUrl,
      })

      if (maybeDestinationAsset.isErr()) return Err(maybeDestinationAsset.unwrapErr())
      if (maybeSourceAsset.isErr()) return Err(maybeSourceAsset.unwrapErr())

      const destinationAsset = maybeDestinationAsset.unwrap()
      const sourceAsset = maybeSourceAsset.unwrap()

      const minimumPrice = calculateChainflipMinPrice({
        slippageTolerancePercentageDecimal: tradeQuote.slippageTolerancePercentageDecimal,
        sellAsset,
        buyAsset,
        buyAmountAfterFeesCryptoBaseUnit: step.buyAmountAfterFeesCryptoBaseUnit,
        sellAmountIncludingProtocolFeesCryptoBaseUnit:
          step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      })

      const serviceCommission = parseInt(tradeQuote.affiliateBps)

      const maybeSwapResponse = await getChainFlipSwap({
        brokerUrl,
        apiKey,
        sourceAsset,
        minimumPrice,
        destinationAsset,
        destinationAddress: receiveAddress,
        refundAddress: sendAddress,
        maxBoostFee: step.chainflipSpecific?.chainflipMaxBoostFee,
        numberOfChunks: step.chainflipSpecific?.chainflipNumberOfChunks,
        chunkIntervalBlocks: step.chainflipSpecific?.chainflipChunkIntervalBlocks,
        commissionBps: serviceCommission,
      })

      if (maybeSwapResponse.isErr()) {
        const error = maybeSwapResponse.unwrapErr()
        const cause = error.cause as AxiosError<any, any>
        console.error(cause)
        return Err(
          makeSwapErrorRight({
            message: `Error fetching Chainflip swap`,
            code: TradeQuoteError.UnknownError,
          }),
        )
      }

      const { data: swapResponse } = maybeSwapResponse.unwrap()

      if (swapResponse.id === undefined || swapResponse.id === null) throw Error('Missing Swap Id')
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
                from: sendAddress,
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
    quotes
      .map(quote => {
        if (!quote.receiveAddress) {
          console.error('receiveAddress is required')
          return undefined
        }
        return {
          ...quote,
          quoteOrRate: 'quote' as const,
          receiveAddress,
          steps: quote.steps.map(step => step) as
            | [TradeQuoteStep]
            | [TradeQuoteStep, TradeQuoteStep],
        }
      })
      .filter(isSome),
  )
}
