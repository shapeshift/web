import type { Result } from '@sniptt/monads'
import type { AxiosError } from 'axios'

import type {
  CommonTradeQuoteInput,
  GetTradeRateInput,
  SwapErrorRight,
  SwapperDeps,
  TradeRate,
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
import { _getTradeQuote } from './getTradeQuote'

// This isn't a mistake. A trade rate *is* a trade quote. Chainflip doesn't really have a notion of a trade quote,
// they do have a notion of a "swap" (which we effectively only use to get the deposit address), which is irrelevant to the notion of quote vs. rate
export const getTradeRate = async (
  input: GetTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<TradeRate[], SwapErrorRight>> => {
  const rates = await _getTradeQuote(input as unknown as CommonTradeQuoteInput, deps)

  const brokerUrl = deps.config.REACT_APP_CHAINFLIP_API_URL
  const apiKey = deps.config.REACT_APP_CHAINFLIP_API_KEY

  // For DCA swaps we need to open a deposit channel at this point to attach the swap id to the quote,
  // in order to properly fetch the streaming status later
  rates.map(async tradeQuotes => {
    for (const tradeQuote of tradeQuotes) {
      for (const step of tradeQuote.steps) {
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
            slippageTolerancePercentageDecimal: tradeQuote.slippageTolerancePercentageDecimal,
            sellAsset: step.sellAsset,
            buyAsset: step.buyAsset,
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
    return tradeQuotes
  })

  return rates as Result<TradeRate[], SwapErrorRight>
}
