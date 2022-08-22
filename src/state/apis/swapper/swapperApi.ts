import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/dist/query/react'
import { AssetId, ChainId } from '@shapeshiftoss/caip'
import { Swapper } from '@shapeshiftoss/swapper'
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
  // reducerPath: 'swapperApi',
  baseQuery: fakeBaseQuery(),
  // refetch if network connection i  s dropped, useful for mobile
  refetchOnReconnect: true,
  endpoints: build => ({
    getUsdRate: build.query<GetUsdRateReturn, GetUsdRateArgs>({
      queryFn: async (args, injected) => {
        console.info('########### swapperAPI requesting ##########', args)
        const { rateAssetId, buyAssetId, sellAssetId } = args
        const { getState } = injected
        const state: State = getState() as unknown as State // ReduxState causes circular dependency
        const {
          assets,
          preferences: { featureFlags },
        } = state
        try {
          if (!rateAssetId) throw new Error('rateAssetId is undefined')
          const swapper = await getBestSwapperFromArgs(buyAssetId, sellAssetId, featureFlags)
          if (!swapper) throw new Error('swapper is undefined')
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
