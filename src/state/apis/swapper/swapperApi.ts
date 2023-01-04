import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type { GetTradeQuoteInput, TradeQuote } from '@shapeshiftoss/swapper'
import type { GetTradeQuoteInputArgs } from 'components/Trade/hooks/useSwapper/getTradeQuoteArgs'
import { getTradeQuoteArgs } from 'components/Trade/hooks/useSwapper/getTradeQuoteArgs'
import { getSwapperManager } from 'components/Trade/hooks/useSwapper/swapperManager'
import { getBestSwapperFromArgs } from 'components/Trade/hooks/useSwapper/utils'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'
import { getBestSwapperApi } from 'state/apis/swapper/getBestSwapperApi'
import type { AssetsState } from 'state/slices/assetsSlice/assetsSlice'
import type { Preferences } from 'state/slices/preferencesSlice/preferencesSlice'

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

type State = {
  assets: AssetsState
  preferences: Preferences
}

type GetTradeQuoteReturn = TradeQuote<ChainId>

export const swapperApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'swapperApi',
  endpoints: build => ({
    getUsdRates: build.query<GetUsdRatesReturn, GetUsdRatesArgs>({
      queryFn: async (args, { getState }) => {
        const { feeAssetId } = args
        const buyAssetId = args.tradeQuoteInputArgs
          ? args.tradeQuoteInputArgs.buyAsset.assetId
          : args.tradeQuoteArgs.buyAsset.assetId
        const sellAssetId = args.tradeQuoteInputArgs
          ? args.tradeQuoteInputArgs.sellAsset.assetId
          : args.tradeQuoteArgs.sellAsset.assetId
        const state: State = getState() as unknown as State // ReduxState causes circular dependency
        const {
          assets,
          preferences: { featureFlags },
        } = state
        try {
          const tradeQuoteArgs = args.tradeQuoteInputArgs
            ? await getTradeQuoteArgs(args.tradeQuoteInputArgs)
            : args.tradeQuoteArgs
          if (!tradeQuoteArgs) throw new Error('tradeQuoteArgs is undefined')
          const feeAsset = assets.byId[feeAssetId]
          const buyAsset = assets.byId[buyAssetId]
          const sellAsset = assets.byId[sellAssetId]

          if (!feeAsset) throw new Error(`Asset not found for AssetId ${feeAssetId}`)
          if (!buyAsset) throw new Error(`Asset not found for AssetId ${buyAssetId}`)
          if (!sellAsset) throw new Error(`Asset not found for AssetId ${sellAssetId}`)

          const swapper = await getBestSwapperFromArgs({
            featureFlags,
            tradeQuoteArgs,
            feeAsset,
          })
          const [feeAssetUsdRate, buyAssetUsdRate, sellAssetUsdRate] = await Promise.all([
            swapper.getUsdRate(feeAsset),
            swapper.getUsdRate(buyAsset),
            swapper.getUsdRate(sellAsset),
          ])
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
            getBestSwapperApi.endpoints.getBestSwapperType.initiate({ ...args, feeAsset }),
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

export const { useGetTradeQuoteQuery, useGetUsdRatesQuery } = swapperApi
