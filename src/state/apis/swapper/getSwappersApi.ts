import type { ChainId } from '@shapeshiftoss/caip'
import { getSwapperManager } from 'components/Trade/hooks/useSwapper/swapperManager'
import type { GetSwappersWithQuoteMetadataArgs, SwapperType, TradeQuote } from 'lib/swapper/api'
import { swapperApi } from 'state/apis/swapper/swapperApi'
import type { State } from 'state/apis/types'
import { apiErrorHandler } from 'state/apis/utils'

const getSwappersErrorHandler = apiErrorHandler('getAvailableSwappers: error getting swappers')

type GetAvailableSwappersReturn = {
  /*
    We can't return the swapper directly as it is not serializable, so we return the SwapperType which can be matched
    to a swapper in the swapperManager, which is keyed by SwapperType
 */
  swapperType: SwapperType
  quote: TradeQuote<ChainId>
  inputOutputRatio: number | undefined
}[]

export const getSwappersApi = swapperApi.injectEndpoints({
  endpoints: build => ({
    getAvailableSwappers: build.query<GetAvailableSwappersReturn, GetSwappersWithQuoteMetadataArgs>(
      {
        queryFn: async (args, { getState }) => {
          const state: State = getState() as unknown as State // ReduxState causes circular dependency
          const featureFlags = state.preferences.featureFlags
          const swapperManager = await getSwapperManager(featureFlags)

          try {
            const swappersWithQuoteMetadata = await swapperManager.getSwappersWithQuoteMetadata(
              args,
            )
            const swappersWithType = swappersWithQuoteMetadata.map(s => ({
              ...s,
              swapperType: s.swapper.getType(),
            }))
            return { data: swappersWithType }
          } catch (error) {
            return getSwappersErrorHandler(error)
          }
        },
      },
    ),
  }),
})
