import type { Asset } from '@shapeshiftoss/asset-service'
import type { GetTradeQuoteInput, SwapperType } from '@shapeshiftoss/swapper'
import { getSwapperManager } from 'components/Trade/hooks/useSwapper/swapperManager'
import { swapperApi } from 'state/apis/swapper/swapperApi'
import type { State } from 'state/apis/types'
import { handleApiError } from 'state/apis/utils'

type GetBestSwapperArgs = GetTradeQuoteInput & { feeAsset: Asset }

/*
We can't return the swapper directly as it is not serializable, so we return the SwapperType which can be matched
to a swapper in the swapperManager, which is keyed by SwapperType
 */
type GetBestSwapperReturn = SwapperType

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
          if (!type) throw new Error('getBestSwapperType: No swapper type found')
          return { data: type }
        } catch (e) {
          return handleApiError(e, 'getBestSwapperType: error getting best swapper type')
        }
      },
    }),
  }),
})
