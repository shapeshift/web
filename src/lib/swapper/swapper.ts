import type { AssetId } from '@shapeshiftoss/caip'
import { AssetService } from 'lib/asset-service'
import { cowSwapper } from 'lib/swapper/swappers/CowSwapper/CowSwapper2'
import { cowApi } from 'lib/swapper/swappers/CowSwapper/endpoints'
import { lifiApi } from 'lib/swapper/swappers/LifiSwapper/endpoints'
import { lifiSwapper } from 'lib/swapper/swappers/LifiSwapper/LifiSwapper2'
import { oneInchApi } from 'lib/swapper/swappers/OneInchSwapper/endpoints'
import { oneInchSwapper } from 'lib/swapper/swappers/OneInchSwapper/OneInchSwapper2'
import { osmosisApi } from 'lib/swapper/swappers/OsmosisSwapper/endpoints'
import { osmosisSwapper } from 'lib/swapper/swappers/OsmosisSwapper/OsmosisSwapper2'
import { thorchainApi } from 'lib/swapper/swappers/ThorchainSwapper/endpoints'
import { thorchainSwapper } from 'lib/swapper/swappers/ThorchainSwapper/ThorchainSwapper2'
import { zrxApi } from 'lib/swapper/swappers/ZrxSwapper/endpoints'
import { zrxSwapper } from 'lib/swapper/swappers/ZrxSwapper/ZrxSwapper2'
import { isFulfilled as isFulfilledPredicate, timeout } from 'lib/utils'

import type { GetTradeQuoteInput, SwapErrorRight, TradeQuote2 } from './api'
import { SwapperName } from './api'
import { QUOTE_TIMEOUT_ERROR, QUOTE_TIMEOUT_MS } from './constants'
import type { QuoteResult, TradeQuoteDeps } from './types'

const swappers = [
  {
    swapperName: SwapperName.LIFI,
    swapper: { ...lifiSwapper, ...lifiApi },
  },
  {
    swapperName: SwapperName.Thorchain,
    swapper: { ...thorchainSwapper, ...thorchainApi },
  },
  {
    swapperName: SwapperName.Zrx,
    swapper: { ...zrxSwapper, ...zrxApi },
  },
  {
    swapperName: SwapperName.CowSwap,
    swapper: { ...cowSwapper, ...cowApi },
  },
  {
    swapperName: SwapperName.OneInch,
    swapper: { ...oneInchSwapper, ...oneInchApi },
  },
  {
    swapperName: SwapperName.Osmosis,
    swapper: { ...osmosisSwapper, ...osmosisApi },
  },
]

// gets trade quotes
export const getTradeQuotes = async (
  getTradeQuoteInput: GetTradeQuoteInput,
  enabledSwappers: SwapperName[],
  deps: TradeQuoteDeps,
): Promise<QuoteResult[]> => {
  const quotes = await Promise.allSettled(
    swappers
      .filter(({ swapperName }) => enabledSwappers.includes(swapperName))
      .map(({ swapperName, swapper }) =>
        timeout<TradeQuote2, SwapErrorRight>(
          swapper.getTradeQuote(getTradeQuoteInput, deps),
          QUOTE_TIMEOUT_MS,
          QUOTE_TIMEOUT_ERROR,
        ).then(quote => ({
          ...quote,
          swapperName,
        })),
      ),
  )

  // This should never happen but it may - we should be using monadic error handling all the way through swapper call stack
  // in case this logs an error from a rejected promise, it means we throw somewhere and forgot to handle errors the monadic way
  const successfulQuotes = quotes
    .filter(result => {
      const isFulfilled = isFulfilledPredicate(result)
      if (!isFulfilled) {
        console.error(result.reason)
      }
      return isFulfilled
    })
    .map(result => (result as PromiseFulfilledResult<QuoteResult>).value)

  return successfulQuotes
}

export const getSupportedSellAssets = async (enabledSwappers: SwapperName[]) => {
  const assetIds = new AssetService().allIds
  const supportedAssetIds = await Promise.all(
    swappers
      .filter(({ swapperName }) => enabledSwappers.includes(swapperName))
      .map(({ swapper }) => swapper.filterAssetIdsBySellable(assetIds)),
  )
  return new Set(supportedAssetIds.flat())
}

export const getSupportedBuyAssets = async (
  enabledSwappers: SwapperName[],
  sellAssetId: AssetId,
) => {
  const nonNftAssetIds = new AssetService().allIds
  const supportedAssetIds = await Promise.all(
    swappers
      .filter(({ swapperName }) => enabledSwappers.includes(swapperName))
      .map(({ swapper }) => swapper.filterBuyAssetsBySellAssetId({ nonNftAssetIds, sellAssetId })),
  )
  return new Set(supportedAssetIds.flat())
}
