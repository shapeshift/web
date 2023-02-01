import type { AssetId } from '@shapeshiftoss/caip'
import type { SwapperName } from '@shapeshiftoss/swapper'
import { isTradingActive } from 'components/Trade/utils'
import { swapperApi } from 'state/apis/swapper/swapperApi'
import { apiErrorHandler } from 'state/apis/utils'

type GetIsTradingActiveArgs = { assetId: AssetId | undefined; swapperName: SwapperName }

type GetIsTradingActiveReturn = boolean

const getIsTradingActiveErrorHandler = apiErrorHandler(
  'getIsTradingActiveApi: error getting trading status',
)

export const getIsTradingActiveApi = swapperApi.injectEndpoints({
  endpoints: build => ({
    getIsTradingActive: build.query<GetIsTradingActiveReturn, GetIsTradingActiveArgs>({
      queryFn: async ({ assetId, swapperName }) => {
        try {
          return { data: await isTradingActive(assetId, swapperName) }
        } catch (error) {
          return getIsTradingActiveErrorHandler(error)
        }
      },
    }),
  }),
})
