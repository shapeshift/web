import type { AssetId } from '@shapeshiftoss/caip'
import type { SwapperType } from '@shapeshiftoss/swapper'
import { isTradingActive } from 'components/Trade/utils'
import { swapperApi } from 'state/apis/swapper/swapperApi'
import { apiErrorHandler } from 'state/apis/utils'

type GetIsTradingActiveArgs = { assetId: AssetId; swapperType: SwapperType }

type GetIsTradingActiveReturn = Boolean

const getIsTradingActiveErrorHandler = apiErrorHandler(
  'getIsTradingActiveApi: error getting trading status',
)

export const getIsTradingActiveApi = swapperApi.injectEndpoints({
  endpoints: build => ({
    getIsTradingActive: build.query<GetIsTradingActiveReturn, GetIsTradingActiveArgs>({
      queryFn: async ({ assetId, swapperType }) => {
        try {
          return { data: await isTradingActive(assetId, swapperType) }
        } catch (error) {
          return getIsTradingActiveErrorHandler(error)
        }
      },
    }),
  }),
})
