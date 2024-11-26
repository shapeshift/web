import { Err, Ok } from '@sniptt/monads'
import type { AxiosError } from 'axios'

import type {
  CommonTradeQuoteInput,
  GetTradeRateInput,
  SwapperDeps,
  TradeQuoteResult,
} from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { CHAINFLIP_BAAS_COMMISSION } from '../constants'
import {
  calculateChainflipMinPrice,
  getChainFlipIdFromAssetId,
  getChainFlipSwap,
} from '../utils/helpers'
import { _getTradeRate } from './getTradeRate'

const _getTradeQuote = async (
  input: CommonTradeQuoteInput,
  deps: SwapperDeps,
): Promise<TradeQuoteResult> => {
  const maybeTradeRates = await _getTradeRate(input as unknown as GetTradeRateInput, deps)

  if (maybeTradeRates.isErr()) return Err(maybeTradeRates.unwrapErr())

  const brokerUrl = deps.config.REACT_APP_CHAINFLIP_API_URL
  const apiKey = deps.config.REACT_APP_CHAINFLIP_API_KEY

  const tradeRates = maybeTradeRates.unwrap()

  // We need to open a deposit channel at this point to attach the swap id to the quote,
  // in order to properly fetch the streaming status later
  for (const tradeRate of tradeRates) {
    for (const step of tradeRate.steps) {
      if (!input.receiveAddress) throw Error('missing receive address')
      if (!input.sendAddress) throw Error('missing send address')

      const sourceAsset = await getChainFlipIdFromAssetId({
        assetId: step.sellAsset.assetId,
        brokerUrl,
      })
      const destinationAsset = await getChainFlipIdFromAssetId({
        assetId: step.buyAsset.assetId,
        brokerUrl,
      })

      const minimumPrice = calculateChainflipMinPrice({
        slippageTolerancePercentageDecimal: tradeRate.slippageTolerancePercentageDecimal,
        sellAsset: step.sellAsset,
        buyAsset: step.buyAsset,
        buyAmountAfterFeesCryptoBaseUnit: step.buyAmountAfterFeesCryptoBaseUnit,
        sellAmountIncludingProtocolFeesCryptoBaseUnit:
          step.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      })

      let serviceCommission = parseInt(tradeRate.affiliateBps) - CHAINFLIP_BAAS_COMMISSION
      if (serviceCommission < 0) serviceCommission = 0

      const maybeSwapResponse = await getChainFlipSwap({
        brokerUrl,
        apiKey,
        sourceAsset,
        destinationAsset,
        destinationAddress: input.receiveAddress,
        minimumPrice,
        refundAddress: input.sendAddress,
        commissionBps: serviceCommission,
        numberOfChunks: step.chainflipNumberOfChunks,
        chunkIntervalBlocks: step.chainflipChunkIntervalBlocks,
        maxBoostFee: step.chainflipMaxBoostFee,
      })

      if (maybeSwapResponse.isErr()) {
        const error = maybeSwapResponse.unwrapErr()
        const cause = error.cause as AxiosError<any, any>
        throw Error(cause.response!.data.detail)
      }

      const { data: swapResponse } = maybeSwapResponse.unwrap()

      if (!swapResponse.id) throw Error('Missing Swap Id')
      if (!swapResponse.address) throw Error('Missing Deposit Channel')

      step.chainflipSwapId = swapResponse.id
      step.chainflipDepositAddress = swapResponse.address
    }
  }

  return Ok(tradeRates) as TradeQuoteResult
}

export const getTradeQuote = async (
  input: CommonTradeQuoteInput,
  deps: SwapperDeps,
): Promise<TradeQuoteResult> => {
  const { accountNumber } = input

  if (accountNumber === undefined) {
    return Err(
      makeSwapErrorRight({
        message: `accountNumber is required`,
        code: TradeQuoteError.UnknownError,
      }),
    )
  }

  return await _getTradeQuote(input, deps)
}
