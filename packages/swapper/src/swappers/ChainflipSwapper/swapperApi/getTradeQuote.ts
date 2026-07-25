import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { AxiosError } from 'axios'

import type { SwapErrorRight, SwapperDeps, TradeQuote } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { assertQuoteAddresses, makeSwapErrorRight } from '../../../utils'
import type { ChainflipMetadata, ChainflipTradeQuoteInput } from '../types'
import { getChainflipStepData } from '../utils/getChainflipStepData'
import { getChainflipTradeContexts } from '../utils/getChainflipTradeContexts'
import { calculateChainflipMinPrice, getChainFlipSwap } from '../utils/helpers'

export const getTradeQuote = async (
  input: ChainflipTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  const brokerUrl = deps.config.VITE_CHAINFLIP_API_URL
  const apiKey = deps.config.VITE_CHAINFLIP_API_KEY

  const { accountNumber, sellAsset, buyAsset, affiliateBps } = input

  const maybeAddresses = assertQuoteAddresses(input)

  if (maybeAddresses.isErr()) return Err(maybeAddresses.unwrapErr())
  const { sendAddress, receiveAddress } = maybeAddresses.unwrap()

  const maybeTradeContexts = await getChainflipTradeContexts(input, deps)

  if (maybeTradeContexts.isErr()) return Err(maybeTradeContexts.unwrapErr())
  const tradeContexts = maybeTradeContexts.unwrap()

  const tradeQuotes: TradeQuote[] = []

  for (const {
    tradeCommon,
    stepCommon,
    protocolFees,
    stepDataArgs,
    channelParams,
  } of tradeContexts) {
    const minimumPrice = calculateChainflipMinPrice({
      slippageTolerancePercentageDecimal: tradeCommon.slippageTolerancePercentageDecimal,
      sellAsset,
      buyAsset,
      buyAmountAfterFeesCryptoBaseUnit: channelParams.buyAmountAfterFeesCryptoBaseUnit,
      sellAmountIncludingProtocolFeesCryptoBaseUnit:
        stepCommon.sellAmountIncludingProtocolFeesCryptoBaseUnit,
    })

    const maybeSwapResponse = await getChainFlipSwap({
      brokerUrl,
      apiKey,
      sourceAsset: channelParams.sourceAsset,
      destinationAsset: channelParams.destinationAsset,
      destinationAddress: receiveAddress,
      refundAddress: sendAddress,
      minimumPrice,
      maxBoostFee: channelParams.maxBoostFee,
      numberOfChunks: channelParams.numberOfChunks,
      chunkIntervalBlocks: channelParams.chunkIntervalBlocks,
      commissionBps: parseInt(affiliateBps),
    })

    if (maybeSwapResponse.isErr()) {
      console.error(maybeSwapResponse.unwrapErr().cause as AxiosError<any, any>)
      return Err(
        makeSwapErrorRight({
          message: 'Error fetching Chainflip swap',
          code: TradeQuoteError.UnknownError,
        }),
      )
    }

    const { data: swapResponse } = maybeSwapResponse.unwrap()
    const { address: depositAddress, id: swapId } = swapResponse

    if (!swapId || !depositAddress) {
      return Err(
        makeSwapErrorRight({
          message: 'Invalid swap response',
          code: TradeQuoteError.UnknownError,
        }),
      )
    }

    const maybeStepData = await getChainflipStepData({
      ...stepDataArgs,
      type: 'quote',
      input,
      depositAddress,
      from: sendAddress,
    })

    if (maybeStepData.isErr()) return Err(maybeStepData.unwrapErr())
    const { transactionData, networkFeeCryptoBaseUnit } = maybeStepData.unwrap()

    tradeQuotes.push({
      ...tradeCommon,
      quoteOrRate: 'quote' as const,
      receiveAddress,
      steps: [
        {
          ...stepCommon,
          accountNumber,
          chainflipSpecific: { depositAddress },
          swapperMetadata: { name: 'chainflip', swapId } satisfies ChainflipMetadata,
          transactionData,
          feeData: { networkFeeCryptoBaseUnit, protocolFees },
        },
      ],
    })
  }

  return Ok(tradeQuotes)
}
