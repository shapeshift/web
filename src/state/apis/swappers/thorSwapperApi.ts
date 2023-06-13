import type { Result } from '@sniptt/monads/build'
import type { GetTradeQuoteInput, SwapErrorRight, TradeQuote } from 'lib/swapper/api'
import { getThorTradeQuote } from 'lib/swapper/swappers/ThorchainSwapper/getThorTradeQuote/getTradeQuote'
import type { ThorChainId } from 'lib/swapper/swappers/ThorchainSwapper/ThorchainSwapper'
import type { ReduxState } from 'state/reducer'
import { selectFeeAssetById } from 'state/slices/assetsSlice/selectors'
import { selectUsdRateByAssetId } from 'state/slices/marketDataSlice/selectors'

import { swappersApi } from './swappersApi'

export const thorSwapperApi = swappersApi.injectEndpoints({
  endpoints: build => ({
    getThorTradeQuote: build.query<
      Result<TradeQuote<ThorChainId>, SwapErrorRight>,
      GetTradeQuoteInput
    >({
      queryFn: async (getTradeQuoteInput: GetTradeQuoteInput, { getState }) => {
        const state: ReduxState = getState() as ReduxState
        const feeAsset = selectFeeAssetById(state, getTradeQuoteInput.sellAsset.assetId)

        const sellAssetUsdRate = selectUsdRateByAssetId(state, getTradeQuoteInput.sellAsset.assetId)
        const buyAssetUsdRate = selectUsdRateByAssetId(state, getTradeQuoteInput.buyAsset.assetId)
        const feeAssetUsdRate = feeAsset
          ? selectUsdRateByAssetId(state, feeAsset.assetId)
          : undefined

        if (!sellAssetUsdRate)
          return {
            error: `no usd rate available for assetId ${getTradeQuoteInput.sellAsset.assetId}`,
          }

        if (!buyAssetUsdRate)
          return {
            error: `no usd rate available for assetId ${getTradeQuoteInput.buyAsset.assetId}`,
          }

        if (!feeAssetUsdRate)
          return {
            error: `no usd rate available for assetId ${feeAsset?.assetId}`,
          }

        const maybeQuote = await getThorTradeQuote(getTradeQuoteInput, {
          sellAssetUsdRate,
          buyAssetUsdRate,
          feeAssetUsdRate,
        })
        return { data: maybeQuote }
      },
    }),
  }),
})

export const { useGetThorTradeQuoteQuery } = thorSwapperApi
