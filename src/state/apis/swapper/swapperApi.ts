import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/dist/query/react'
import { AssetId, ChainId } from '@shapeshiftoss/caip'
import { GetTradeQuoteInput, Swapper, TradeQuote } from '@shapeshiftoss/swapper'
import { getSwapperManager } from 'components/Trade/hooks/useSwapper/swapperManager'
import { AssetsState } from 'state/slices/assetsSlice/assetsSlice'
import { FeatureFlags, Preferences } from 'state/slices/preferencesSlice/preferencesSlice'

type GetUsdRateArgs = {
  rateAssetId: AssetId | undefined
  buyAssetId: AssetId | undefined
  sellAssetId: AssetId | undefined
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
  buyAssetId: AssetId | undefined,
  sellAssetId: AssetId | undefined,
  featureFlags: FeatureFlags,
): Promise<Swapper<ChainId>> => {
  if (!buyAssetId) throw new Error('buyAssetId is undefined')
  if (!sellAssetId) throw new Error('sellAssetId is undefined')
  const swapperManager = await getSwapperManager(featureFlags)
  const swapper = await swapperManager.getBestSwapper({
    buyAssetId,
    sellAssetId,
  })
  if (!swapper) throw new Error('swapper is undefined')
  return swapper
}

export const swapperApi = createApi({
  reducerPath: 'swapperApi',
  baseQuery: fakeBaseQuery(),
  // refetch if network connection is dropped, useful for mobile
  refetchOnReconnect: true,
  keepUnusedDataFor: 60,
  endpoints: build => ({
    getUsdRate: build.query<GetUsdRateReturn, GetUsdRateArgs>({
      queryFn: async ({ rateAssetId, buyAssetId, sellAssetId }, { getState }) => {
        const state: State = getState() as unknown as State // ReduxState causes circular dependency
        const {
          assets,
          preferences: { featureFlags },
        } = state
        try {
          if (!rateAssetId) throw new Error('rateAssetId is undefined')
          const swapper = await getBestSwapperFromArgs(buyAssetId, sellAssetId, featureFlags)
          const rateAsset = assets.byId[rateAssetId]
          const usdRate = await swapper.getUsdRate(rateAsset)
          const data = { usdRate }
          return { data }
        } catch (e) {
          const data = `getAssetDescription: error fetching usd rate for ${rateAssetId}`
          const status = 400
          const error = { data, status }
          return { error }
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
          const data = 'getTradeQuote: error fetching trade quote'
          const status = 400
          const error = { data, status }
          return { error }
        }
      },
    }),
  }),
})

export const { useGetUsdRateQuery, useGetTradeQuoteQuery } = swapperApi
