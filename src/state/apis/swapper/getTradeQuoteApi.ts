import type { ChainId } from '@shapeshiftoss/caip'
import type { GetTradeQuoteInput, TradeQuote } from '@shapeshiftoss/swapper'
import { getSwapperManager } from 'components/Trade/hooks/useSwapper/swapperManager'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { getBestSwapperApi } from 'state/apis/swapper/getBestSwapperApi'
import { swapperApi } from 'state/apis/swapper/swapperApi'
import type { State } from 'state/apis/types'
import { apiErrorHandler } from 'state/apis/utils'

type GetTradeQuoteReturn = TradeQuote<ChainId>

const getBestSwapperType = getBestSwapperApi.endpoints.getBestSwapperType

const getTradeQuoteErrorHandler = apiErrorHandler('getTradeQuote: error fetching trade quote')

export const getTradeQuoteApi = swapperApi.injectEndpoints({
  endpoints: build => ({
    getTradeQuote: build.query<GetTradeQuoteReturn, GetTradeQuoteInput>({
      queryFn: async (args, { getState, dispatch }) => {
        const state: State = getState() as unknown as State // ReduxState causes circular dependency
        const {
          preferences: { featureFlags },
          assets,
        } = state
        try {
          const feeAssetId = getChainAdapterManager().get(args.buyAsset.chainId)!.getFeeAssetId()
          const feeAsset = assets.byId[feeAssetId]
          if (!feeAsset) throw new Error(`Asset not found for AssetId ${feeAssetId}`)

          const swapperManager = await getSwapperManager(featureFlags)
          const swappers = swapperManager.swappers
          const swapperType = await dispatch(
            getBestSwapperType.initiate({ ...args, feeAsset }),
          ).then(r => r.data)
          const swapper = swapperType ? swappers.get(swapperType) : undefined
          const tradeQuote = await swapper?.getTradeQuote(args)
          if (!tradeQuote)
            return getTradeQuoteErrorHandler({ message: 'getTradeQuote: No trade quote found' })

          return { data: tradeQuote }
        } catch (error) {
          return getTradeQuoteErrorHandler()
        }
      },
    }),
  }),
})

export const { useGetTradeQuoteQuery } = getTradeQuoteApi
