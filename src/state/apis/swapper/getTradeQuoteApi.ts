import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { ChainId } from '@shapeshiftoss/caip'
import type { GetTradeQuoteInput, TradeQuote } from '@shapeshiftoss/swapper'
import { getSwapperManager } from 'components/Trade/hooks/useSwapper/swapperManager'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'
import { getBestSwapperApi } from 'state/apis/swapper/getBestSwapperApi'
import type { State } from 'state/apis/types'

type GetTradeQuoteReturn = TradeQuote<ChainId>

const getBestSwapperType = getBestSwapperApi.endpoints.getBestSwapperType

export const getTradeQuoteApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'getTradeQuoteApi',
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
          return { data: tradeQuote }
        } catch (e) {
          return {
            error: {
              error: 'getTradeQuote: error fetching trade quote',
              status: 'CUSTOM_ERROR',
            },
          }
        }
      },
    }),
  }),
})

export const { useGetTradeQuoteQuery } = getTradeQuoteApi
