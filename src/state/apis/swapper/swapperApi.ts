import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/dist/query/react'
import { AssetId } from '@shapeshiftoss/caip'
import { getSwapperManager } from 'components/Trade/hooks/useSwapper/swapperManager'
import { Preferences } from 'state/slices/preferencesSlice/preferencesSlice'

type GetUsdRateArgs = {
  rateAssetId: AssetId | undefined
  buyAssetId: AssetId | undefined
  sellAssetId: AssetId | undefined
}

type GetUsdRateReturn = {
  usdRate: string
}

export const swapperApi = createApi({
  reducerPath: 'swapperApi',
  // not actually used, only used to satisfy createApi, we use a custom queryFn
  baseQuery: fetchBaseQuery({ baseUrl: '/' }),
  // refetch if network connection is dropped, useful for mobile
  refetchOnReconnect: true,
  endpoints: build => ({
    // TODO: maybe return rates as an object of rates. Or have a second endpoint that returns results from the first?
    // Could move the logic into a pure function
    // getUsdRateByAssetId() and getUsdRates()
    getUsdRate: build.query<GetUsdRateReturn, GetUsdRateArgs>({
      queryFn: async (args, injected) => {
        console.info('########### swapperAPI requesting ##########', args)
        const { rateAssetId, buyAssetId, sellAssetId } = args
        try {
          if (!buyAssetId) throw new Error('buyAssetId is undefined')
          if (!sellAssetId) throw new Error('sellAssetId is undefined')
          if (!rateAssetId) throw new Error('rateAssetId is undefined')
          const { getState } = injected
          const state: any = getState() // ReduxState causes circular dependency
          const { featureFlags } = state.preferences as Preferences
          const swapperManager = await getSwapperManager(featureFlags)
          const swapper = await swapperManager.getBestSwapper({
            buyAssetId,
            sellAssetId,
          })
          if (!swapper) throw new Error('swapper is undefined')
          const { assets } = state
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
  }),
})

export const { useGetUsdRateQuery } = swapperApi
