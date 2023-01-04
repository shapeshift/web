import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { GetTradeQuoteInput, SwapperType } from '@shapeshiftoss/swapper'
import { getSwapperManager } from 'components/Trade/hooks/useSwapper/swapperManager'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'
import type { AssetsState } from 'state/slices/assetsSlice/assetsSlice'
import type { Preferences } from 'state/slices/preferencesSlice/preferencesSlice'

type State = {
  assets: AssetsState
  preferences: Preferences
}

type GetBestSwapperArgs = GetTradeQuoteInput & { feeAsset: Asset }

/*
We can't return the swapper directly as it is not serializable, so we return the SwapperType which can be matched
to a swapper in the swapperManager, which is keyed by SwapperType
 */
type GetBestSwapperReturn = SwapperType | undefined

export const getBestSwapperApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'getBestSwapperApi',
  endpoints: build => ({
    getBestSwapperType: build.query<GetBestSwapperReturn, GetBestSwapperArgs>({
      queryFn: async (args, { getState }) => {
        const state: State = getState() as unknown as State // ReduxState causes circular dependency
        const featureFlags = state.preferences.featureFlags
        const swapperManager = await getSwapperManager(featureFlags)

        try {
          const bestSwapper = await swapperManager.getBestSwapper(args)
          const type = bestSwapper?.getType()
          return { data: type }
        } catch (e) {
          return {
            error: {
              error: 'getBestSwapper: error getting best swapper type',
              status: 'CUSTOM_ERROR',
            },
          }
        }
      },
    }),
  }),
})
