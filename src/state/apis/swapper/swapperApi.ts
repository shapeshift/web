import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/dist/query/react'
import { AssetId } from '@shapeshiftoss/caip'
import { SwapperType } from '@shapeshiftoss/swapper'
import { getSwapperManager } from 'components/Trade/hooks/useSwapper/swapperManager'

type GetUsdRateArgs = {
  assetId: AssetId
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
    getUsdRate: build.query<GetUsdRateReturn, GetUsdRateArgs>({
      queryFn: async (args, injected) => {
        console.info('########### swapperAPI requesting ##########')
        const { assetId } = args
        const { getState } = injected
        const state: any = getState() // ReduxState causes circular dependency
        const { featureFlags } = state.preferences
        const swapperManager = await getSwapperManager(featureFlags)
        const swapper = swapperManager.getSwapper(SwapperType.ZrxEthereum)
        const { assets } = state
        const asset = assets.byId[assetId]
        const usdRate = await swapper.getUsdRate(asset)
        const data = { usdRate }
        return { data }
      },
    }),
  }),
})

export const { useGetUsdRateQuery } = swapperApi
