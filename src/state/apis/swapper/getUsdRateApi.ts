import type { AssetId } from '@shapeshiftoss/caip'
import type { SwapperType } from '@shapeshiftoss/swapper'
import { getSwapperManager } from 'components/Trade/hooks/useSwapper/swapperManager'
import { swapperApi } from 'state/apis/swapper/swapperApi'
import type { State } from 'state/apis/types'
import { handleApiError } from 'state/apis/utils'

export type GetUsdRateArgs = { assetId: AssetId; swapperType: SwapperType }
type GetUsdRateReturn = string | undefined

export const getUsdRateApi = swapperApi.injectEndpoints({
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
          if (!rate) throw new Error('getUsdRate: No rate found')
          return { data: rate }
        } catch (e) {
          return handleApiError(e, 'getUsdRate: error fetching USD rate')
        }
      },
    }),
  }),
})
