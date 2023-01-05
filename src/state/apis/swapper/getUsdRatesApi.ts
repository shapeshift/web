import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { AssetId } from '@shapeshiftoss/caip'
import type { GetTradeQuoteInput } from '@shapeshiftoss/swapper'
import type { GetTradeQuoteInputArgs } from 'components/Trade/hooks/useSwapper/getTradeQuoteArgs'
import { getTradeQuoteArgs } from 'components/Trade/hooks/useSwapper/getTradeQuoteArgs'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'
import { getBestSwapperApi } from 'state/apis/swapper/getBestSwapperApi'
import { getUsdRateApi } from 'state/apis/swapper/getUsdRateApi'
import type { State } from 'state/apis/types'

export type GetUsdRatesArgs = {
  feeAssetId: AssetId
} & (
  | { tradeQuoteInputArgs?: never; tradeQuoteArgs: GetTradeQuoteInput }
  | { tradeQuoteInputArgs: GetTradeQuoteInputArgs; tradeQuoteArgs?: never }
)

type GetUsdRatesReturn = {
  buyAssetUsdRate: string
  sellAssetUsdRate: string
  feeAssetUsdRate: string
}

const getBestSwapperType = getBestSwapperApi.endpoints.getBestSwapperType
const getUsdRate = getUsdRateApi.endpoints.getUsdRate

export const getUsdRatesApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'getUsdRatesApi',
  endpoints: build => ({
    getUsdRates: build.query<GetUsdRatesReturn, GetUsdRatesArgs>({
      queryFn: async (args, { getState, dispatch }) => {
        const { feeAssetId } = args
        const buyAssetId = args.tradeQuoteInputArgs
          ? args.tradeQuoteInputArgs.buyAsset.assetId
          : args.tradeQuoteArgs.buyAsset.assetId
        const sellAssetId = args.tradeQuoteInputArgs
          ? args.tradeQuoteInputArgs.sellAsset.assetId
          : args.tradeQuoteArgs.sellAsset.assetId
        const state: State = getState() as unknown as State // ReduxState causes circular dependency
        const { assets } = state
        try {
          const tradeQuoteArgs = args.tradeQuoteInputArgs
            ? await getTradeQuoteArgs(args.tradeQuoteInputArgs)
            : args.tradeQuoteArgs

          if (!tradeQuoteArgs) throw new Error('tradeQuoteArgs is undefined')
          const feeAsset = assets.byId[feeAssetId]
          if (!feeAsset) throw new Error(`Asset not found for AssetId ${feeAssetId}`)

          const swapperType = await dispatch(
            getBestSwapperType.initiate({
              ...tradeQuoteArgs,
              feeAsset,
            }),
          ).then(r => r.data)

          if (!swapperType) throw new Error(`Swapper type not found.`)

          const feeAssetUsdRate = await dispatch(
            getUsdRate.initiate({ assetId: feeAssetId, swapperType }),
          ).then(r => r.data)
          const buyAssetUsdRate = await dispatch(
            getUsdRate.initiate({ assetId: buyAssetId, swapperType }),
          ).then(r => r.data)
          const sellAssetUsdRate = await dispatch(
            getUsdRate.initiate({ assetId: sellAssetId, swapperType }),
          ).then(r => r.data)

          if (!feeAssetUsdRate || !buyAssetUsdRate || !sellAssetUsdRate)
            throw new Error(`USD rates not found.`)
          const data = { feeAssetUsdRate, buyAssetUsdRate, sellAssetUsdRate }
          return { data }
        } catch (e) {
          return {
            error: {
              error: 'getUsdRates: error fetching USD rates',
              status: 'CUSTOM_ERROR',
            },
          }
        }
      },
    }),
  }),
})

export const { useGetUsdRatesQuery } = getUsdRatesApi
