import { Err, Ok } from '@sniptt/monads'
import type { AxiosError } from 'axios'

import type {
  CommonTradeQuoteInput,
  GetTradeRateInput,
  SwapperDeps,
  TradeQuoteResult,
} from '../../../types'
import {
  CHAINFLIP_BAAS_COMMISSION,
  CHAINFLIP_DCA_BOOST_SWAP_SOURCE,
  CHAINFLIP_DCA_SWAP_SOURCE,
} from '../constants'
import {
  calculateChainflipMinPrice,
  getChainFlipIdFromAssetId,
  getChainFlipSwap,
} from '../utils/helpers'
import { _getTradeRate } from './getTradeRate'

export const getTradeQuote = async (
  input: CommonTradeQuoteInput,
  deps: SwapperDeps,
): Promise<TradeQuoteResult> => {
  const maybeTradeRates = await _getTradeRate(input as unknown as GetTradeRateInput, deps)

  if (maybeTradeRates.isErr()) return Err(maybeTradeRates.unwrapErr())

  const brokerUrl = deps.config.REACT_APP_CHAINFLIP_API_URL
  const apiKey = deps.config.REACT_APP_CHAINFLIP_API_KEY

  const tradeRates = maybeTradeRates.unwrap()

  // For DCA swaps we need to open a deposit channel at this point to attach the swap id to the quote,
  // in order to properly fetch the streaming status later
  for (const tradeRate of tradeRates) {
    for (const step of tradeRate.steps) {
      if (
        step.source === CHAINFLIP_DCA_BOOST_SWAP_SOURCE ||
        step.source === CHAINFLIP_DCA_SWAP_SOURCE
      ) {
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
          maxBoostFee: 0,
        })

        if (maybeSwapResponse.isErr()) {
          const error = maybeSwapResponse.unwrapErr()
          const cause = error.cause as AxiosError<any, any>
          throw Error(cause.response!.data.detail)
        }

        const { data: swapResponse } = maybeSwapResponse.unwrap()

        if (!swapResponse.id) throw Error('missing swap ID')

        step.chainflipSwapId = swapResponse.id
        step.chainflipDepositAddress = swapResponse.address
      }
    }
  }

  return Ok(tradeRates) as TradeQuoteResult
}
