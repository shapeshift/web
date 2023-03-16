import type { ChainId } from '@shapeshiftoss/caip'
import type { GetTradeQuoteInput, SwapperType, TradeQuote } from '@shapeshiftoss/swapper'
import { getSwapperManager } from 'components/Trade/hooks/useSwapper/swapperManager'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { swapperApi } from 'state/apis/swapper/swapperApi'
import type { State } from 'state/apis/types'
import { apiErrorHandler } from 'state/apis/utils'

type GetTradeQuoteReturn = TradeQuote<ChainId>
type GetTradeQuoteArgs = GetTradeQuoteInput & { activeSwapperType: SwapperType }

const getTradeQuoteErrorHandler = apiErrorHandler('getTradeQuote: error fetching trade quote')

export const getTradeQuoteApi = swapperApi.injectEndpoints({
  endpoints: build => ({
    getTradeQuote: build.query<GetTradeQuoteReturn, GetTradeQuoteArgs>({
      queryFn: async (args, { getState }) => {
        const state: State = getState() as unknown as State // ReduxState causes circular dependency
        const activeSwapperType = args.activeSwapperType
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
          const swapper = activeSwapperType ? swappers.get(activeSwapperType) : undefined
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
