import type { Asset } from '@shapeshiftoss/asset-service'
import type { GetTradeQuoteInput, SwapperType } from '@shapeshiftoss/swapper'
import { getSwapperManager } from 'components/Trade/hooks/useSwapper/swapperManager'
import { swapperApi } from 'state/apis/swapper/swapperApi'
import type { State } from 'state/apis/types'

type GetBestSwapperArgs = GetTradeQuoteInput & { feeAsset: Asset }

/*
We can't return the swapper directly as it is not serializable, so we return the SwapperType which can be matched
to a swapper in the swapperManager, which is keyed by SwapperType
 */
type GetBestSwapperReturn = SwapperType | undefined

export const getBestSwapperApi = swapperApi.injectEndpoints({
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
