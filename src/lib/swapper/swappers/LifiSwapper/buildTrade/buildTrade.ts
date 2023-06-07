import type { ChainKey } from '@lifi/sdk'
import type { ChainId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err } from '@sniptt/monads'
import type { BuildTradeInput, SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import { getTradeQuote } from 'lib/swapper/swappers/LifiSwapper/getTradeQuote/getTradeQuote'
import { isGetEvmTradeQuoteInput } from 'lib/swapper/swappers/LifiSwapper/utils/isGetEvmTradeQuoteInput/isGetEvmTradeQuoteInput'
import { selectAssets, selectMarketDataById } from 'state/slices/selectors'
import { store } from 'state/store'

import type { LifiTrade } from '../utils/types'

export const buildTrade = async (
  input: BuildTradeInput,
  lifiChainMap: Map<ChainId, ChainKey>,
): Promise<Result<LifiTrade, SwapErrorRight>> => {
  if (!isGetEvmTradeQuoteInput(input)) {
    return Err(
      makeSwapErrorRight({
        message: '[buildTrade] - only EVM chains are supported',
        code: SwapErrorType.UNSUPPORTED_CHAIN,
        details: input,
      }),
    )
  }

  const { receiveAddress } = input

  if (!receiveAddress)
    return Err(
      makeSwapErrorRight({
        message: 'Receive address is required to build Li.Fi trades',
        code: SwapErrorType.MISSING_INPUT,
      }),
    )

  const assets = selectAssets(store.getState())
  const { price: sellAssetPriceUsdPrecision } = selectMarketDataById(
    store.getState(),
    input.sellAsset.assetId,
  )
  // TODO: determine whether we should be fetching another quote like below or modify `executeTrade.ts`
  // to allow passing the existing quote in.
  return (await getTradeQuote(input, lifiChainMap, assets, sellAssetPriceUsdPrecision)).map(
    tradeQuote => ({
      ...tradeQuote.steps[0],
      selectedLifiRoute: tradeQuote.selectedLifiRoute,
      receiveAddress,
    }),
  )
}
