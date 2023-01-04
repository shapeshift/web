import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { AssetId } from '@shapeshiftoss/caip'
import type { SwapperType } from '@shapeshiftoss/swapper'
import { getSwapperManager } from 'components/Trade/hooks/useSwapper/swapperManager'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'
import type { AssetsState } from 'state/slices/assetsSlice/assetsSlice'
import type { Preferences } from 'state/slices/preferencesSlice/preferencesSlice'

export type GetUsdRateArgs = { assetId: AssetId; swapperType: SwapperType }

type GetUsdRateReturn = string | undefined

type State = {
  assets: AssetsState
  preferences: Preferences
}

export const usdRateApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'usdRateApi',
  endpoints: build => ({
    getUsdRate: build.query<GetUsdRateReturn, GetUsdRateArgs>({
      queryFn: async ({ assetId, swapperType }, { getState }) => {
        const state: State = getState() as unknown as State // ReduxState causes circular dependency
        const {
          assets,
          preferences: { featureFlags },
        } = state
        try {
          const asset = assets.byId[assetId]
          if (!asset) throw new Error(`Asset not found for AssetId ${assetId}`)

          const swapperManager = await getSwapperManager(featureFlags)
          const swappers = swapperManager.swappers
          const swapper = swapperType ? swappers.get(swapperType) : undefined
          const rate = await swapper?.getUsdRate(asset)

          return { data: rate }
        } catch (e) {
          return {
            error: {
              error: 'getUsdRates: error fetching USD rates',
              status: 'CUSTOM_ERROR',
            },
          }
        }
      },
    }),
  }),
})
