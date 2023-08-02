import type { AssetId } from '@shapeshiftoss/caip'
import { isTradingActive } from 'components/MultiHopTrade/utils'
import type { SwapperName } from 'lib/swapper/api'
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
        const maybeIsTradingActive = await isTradingActive(assetId, swapperName)
        if (maybeIsTradingActive.isErr()) {
          return getIsTradingActiveErrorHandler(maybeIsTradingActive.unwrapErr())
        }
        return {
          data: maybeIsTradingActive.unwrap(),
        }
      },
    }),
  }),
})
