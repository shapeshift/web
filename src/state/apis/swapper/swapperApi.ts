import { createApi } from '@reduxjs/toolkit/dist/query/react'
import { AssetId, ChainId } from '@shapeshiftoss/caip'
import { GetTradeQuoteInput, Swapper, TradeQuote } from '@shapeshiftoss/swapper'
import { getSwapperManager } from 'components/Trade/hooks/useSwapper/swapperManager'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'
import { AssetsState } from 'state/slices/assetsSlice/assetsSlice'
import { FeatureFlags, Preferences } from 'state/slices/preferencesSlice/preferencesSlice'

type GetUsdRateArgs = {
  rateAssetId: AssetId
  buyAssetId: AssetId
  sellAssetId: AssetId
}

type GetUsdRateReturn = {
  usdRate: string
}

type State = {
  assets: AssetsState
  preferences: Preferences
}

type GetTradeQuoteOutput = TradeQuote<ChainId>

const getBestSwapperFromArgs = async (
  buyAssetId: AssetId,
  sellAssetId: AssetId,
  featureFlags: FeatureFlags,
): Promise<Swapper<ChainId>> => {
  const swapperManager = await getSwapperManager(featureFlags)
  const swapper = await swapperManager.getBestSwapper({
    buyAssetId,
    sellAssetId,
  })
  if (!swapper) throw new Error('swapper is undefined')
  return swapper
}

export const swapperApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'swapperApi',
  endpoints: build => ({
    getUsdRate: build.query<GetUsdRateReturn, GetUsdRateArgs>({
      queryFn: async ({ rateAssetId, buyAssetId, sellAssetId }, { getState }) => {
        const state: State = getState() as unknown as State // ReduxState causes circular dependency
        const {
          assets,
          preferences: { featureFlags },
        } = state
        try {
          const swapper = await getBestSwapperFromArgs(buyAssetId, sellAssetId, featureFlags)
          const rateAsset = assets.byId[rateAssetId]
          const usdRate = await swapper.getUsdRate(rateAsset)
          const data = { usdRate }
          return { data }
        } catch (e) {
          return {
            error: {
              error: 'getUsdRate: error fetching usd rate',
              status: 'CUSTOM_ERROR',
            },
          }
        }
      },
    }),
    getTradeQuote: build.query<GetTradeQuoteOutput, GetTradeQuoteInput>({
      queryFn: async (args, { getState }) => {
        const state: State = getState() as unknown as State // ReduxState causes circular dependency
        const {
          preferences: { featureFlags },
        } = state
        try {
          const swapper = await getBestSwapperFromArgs(
            args.sellAsset.assetId,
            args.buyAsset.assetId,
            featureFlags,
          )
          const tradeQuote = await swapper.getTradeQuote(args)
          return { data: tradeQuote }
        } catch (e) {
          return {
            error: {
              error: 'getTradeQuote: error fetching trade quote',
              status: 'CUSTOM_ERROR',
            },
          }
        }
      },
    }),
  }),
})

export const { useGetUsdRateQuery, useLazyGetTradeQuoteQuery } = swapperApi
