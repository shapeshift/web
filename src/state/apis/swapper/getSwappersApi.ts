import type { ChainId } from '@shapeshiftoss/caip'
import { getSwapperManager } from 'components/Trade/hooks/useSwapper/swapperManager'
import type { GetTradeQuoteInput, SwapperName, TradeQuote } from 'lib/swapper/api'
import { swapperApi } from 'state/apis/swapper/swapperApi'
import { apiErrorHandler } from 'state/apis/utils'
import type { ReduxState } from 'state/reducer'
import {
  selectCryptoMarketData,
  selectFeatureFlags,
  selectFeeAssetByChainId,
} from 'state/slices/selectors'

const getSwappersErrorHandler = apiErrorHandler('getAvailableSwappers: error getting swappers')

type GetAvailableSwappersReturn = {
  /*
    We can't return the swapper directly as it is not serializable, so we return the SwapperType which can be matched
    to a swapper in the swapperManager, which is keyed by SwapperType
 */
  swapperName: SwapperName
  quote: TradeQuote<ChainId>
  inputOutputRatio: number | undefined
}[]

export const getSwappersApi = swapperApi.injectEndpoints({
  endpoints: build => ({
    getAvailableSwappers: build.query<GetAvailableSwappersReturn, GetTradeQuoteInput>({
      queryFn: async (getTradeQuoteInput, { getState }) => {
        const state: ReduxState = getState() as ReduxState
        const featureFlags = selectFeatureFlags(state)
        const swapperManager = await getSwapperManager(featureFlags)
        const feeAsset = selectFeeAssetByChainId(state, getTradeQuoteInput.chainId)
        const cryptoMarketDataById = selectCryptoMarketData(state)

        try {
          if (!feeAsset) throw Error(`no fee asset for chainId ${getTradeQuoteInput.chainId}`)
          const swappersWithQuoteMetadata = await swapperManager.getSwappersWithQuoteMetadata({
            ...getTradeQuoteInput,
            feeAsset,
            cryptoMarketDataById,
          })
          const swappersWithType = swappersWithQuoteMetadata.map(s => ({
            ...s,
            swapperName: s.swapper.name,
          }))
          return { data: swappersWithType }
        } catch (error) {
          return getSwappersErrorHandler(error)
        }
      },
    }),
  }),
})
