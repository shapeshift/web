import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { type AssetId, fromAssetId } from '@shapeshiftoss/caip'
import type { GetTradeQuoteInput, SwapperName } from '@shapeshiftoss/swapper'
import { isTradingActive } from 'components/MultiHopTrade/utils'
import {
  getSupportedBuyAssetIds,
  getSupportedSellAssetIds,
  getTradeQuotes,
} from 'lib/swapper/swapper'
import type { ThorEvmTradeQuote } from 'lib/swapper/swappers/ThorchainSwapper/getThorTradeQuote/getTradeQuote'
import { TradeType } from 'lib/swapper/swappers/ThorchainSwapper/utils/longTailHelpers'
import { getEnabledSwappers } from 'lib/swapper/utils'
import { getInputOutputRatioFromQuote } from 'state/apis/swapper/helpers/getInputOutputRatioFromQuote'
import type { ApiQuote } from 'state/apis/swapper/types'
import { TradeQuoteValidationError } from 'state/apis/swapper/types'
import type { ReduxState } from 'state/reducer'
import { selectAssets } from 'state/slices/assetsSlice/selectors'
import { marketApi } from 'state/slices/marketDataSlice/marketDataSlice'
import type { FeatureFlags } from 'state/slices/preferencesSlice/preferencesSlice'
import { selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'
import { selectInputSellAsset } from 'state/slices/tradeInputSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'

import { BASE_RTK_CREATE_API_CONFIG } from '../const'
import { apiErrorHandler } from '../utils'
import { validateTradeQuote } from './helpers/validateTradeQuote'

const getIsTradingActiveErrorHandler = apiErrorHandler(
  'getIsTradingActiveApi: error getting trading status',
)

export const GET_TRADE_QUOTE_POLLING_INTERVAL = 20_000
export const swapperApiBase = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'swapperApi',
  keepUnusedDataFor: Number.MAX_SAFE_INTEGER, // never clear, we will manage this
  tagTypes: ['TradeQuote'],
  endpoints: build => ({
    getIsTradingActive: build.query<
      boolean,
      { assetId: AssetId | undefined; swapperName: SwapperName }
    >({
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

export const swapperApi = swapperApiBase.injectEndpoints({
  endpoints: build => ({
    getTradeQuote: build.query<null, GetTradeQuoteInput>({
      queryFn: async (tradeQuoteInput: GetTradeQuoteInput, { dispatch, getState }) => {
        // clear the trade quote slice to prevent data corruption as results come in
        dispatch(tradeQuoteSlice.actions.clear())

        const state = getState() as ReduxState
        const { sendAddress, receiveAddress, sellAsset, buyAsset, affiliateBps } = tradeQuoteInput
        const isCrossAccountTrade = sendAddress !== receiveAddress
        const featureFlags: FeatureFlags = selectFeatureFlags(state)
        const enabledSwappers = getEnabledSwappers(featureFlags, isCrossAccountTrade)

        // hydrate crypto market data for buy and sell assets
        await dispatch(
          marketApi.endpoints.findByAssetIds.initiate([sellAsset.assetId, buyAsset.assetId]),
        )

        const quoteResults = await getTradeQuotes(
          {
            ...tradeQuoteInput,
            affiliateBps,
          },
          enabledSwappers,
          selectAssets(state),
        )

        if (quoteResults.length === 0) {
          return { data: null }
        }

        const quotesWithInputOutputRatios = quoteResults
          .map(result => {
            if (result.isErr()) {
              const error = result.unwrapErr()
              return [
                {
                  quote: undefined,
                  error,
                  inputOutputRatio: -Infinity,
                  swapperName: result.swapperName,
                },
              ]
            }

            return result.unwrap().map(quote => {
              const inputOutputRatio = getInputOutputRatioFromQuote({
                // We need to get the freshest state after fetching market data above
                state: getState() as ReduxState,
                quote,
                swapperName: result.swapperName,
              })
              return { quote, error: undefined, inputOutputRatio, swapperName: result.swapperName }
            })
          })
          .flat()

        const unorderedQuotes: Omit<ApiQuote, 'index'>[] = await Promise.all(
          quotesWithInputOutputRatios.map(async quoteData => {
            const { quote, swapperName, inputOutputRatio, error } = quoteData
            const tradeType = (quote as ThorEvmTradeQuote)?.tradeType

            const { isTradingActiveOnSellPool, isTradingActiveOnBuyPool } = await (async () => {
              // allow swapper errors to flow through
              if (error !== undefined) {
                return { isTradingActiveOnSellPool: false, isTradingActiveOnBuyPool: false }
              }

              const [{ data: isTradingActiveOnSellPool }, { data: isTradingActiveOnBuyPool }] =
                await Promise.all(
                  [sellAsset.assetId, buyAsset.assetId].map(assetId => {
                    return dispatch(
                      swapperApiBase.endpoints.getIsTradingActive.initiate({
                        assetId,
                        swapperName,
                      }),
                    )
                  }),
                )
              return {
                isTradingActiveOnSellPool:
                  tradeType === TradeType.LongTailToL1 || isTradingActiveOnSellPool,
                isTradingActiveOnBuyPool:
                  tradeType === TradeType.L1ToLongTail || isTradingActiveOnBuyPool,
              }
            })()

            if (isTradingActiveOnSellPool === undefined || isTradingActiveOnBuyPool === undefined) {
              return {
                quote,
                swapperName,
                inputOutputRatio,
                errors: [{ error: TradeQuoteValidationError.QueryFailed }],
                warnings: [],
              }
            }

            const { errors, warnings } = await validateTradeQuote(state, {
              swapperName,
              quote,
              error,
              isTradingActiveOnSellPool,
              isTradingActiveOnBuyPool,
            })
            return {
              quote,
              swapperName,
              inputOutputRatio,
              errors,
              warnings,
            }
          }),
        )

        const tradeQuotesById = unorderedQuotes.reduce(
          (acc, quoteData, i) => {
            acc[quoteData.quote?.id ?? `${quoteData.swapperName}-${i}`] = quoteData
            return acc
          },
          {} as Record<string, Omit<ApiQuote, 'index'>>,
        )

        dispatch(tradeQuoteSlice.actions.upsertTradeQuotes(tradeQuotesById))

        return { data: null }
      },
      providesTags: ['TradeQuote'],
    }),
    getSupportedAssets: build.query<
      {
        supportedSellAssetIds: AssetId[]
        supportedBuyAssetIds: AssetId[]
      },
      { walletSupportedChainIds: ChainId[]; sortedAssetIds: AssetId[] }
    >({
      queryFn: async (
        {
          walletSupportedChainIds,
          sortedAssetIds,
        }: { walletSupportedChainIds: ChainId[]; sortedAssetIds: AssetId[] },
        { getState },
      ) => {
        const state = getState() as ReduxState

        const featureFlags = selectFeatureFlags(state)
        const enabledSwappers = getEnabledSwappers(featureFlags, false)
        const assets = selectAssets(state)
        const sellAsset = selectInputSellAsset(state)

        const supportedSellAssetsSet = await getSupportedSellAssetIds(enabledSwappers, assets)
        const supportedSellAssetIds = sortedAssetIds
          .filter(assetId => supportedSellAssetsSet.has(assetId))
          .filter(assetId => {
            const chainId = fromAssetId(assetId).chainId
            return walletSupportedChainIds.includes(chainId)
          })

        const supportedBuyAssetsSet = await getSupportedBuyAssetIds(
          enabledSwappers,
          sellAsset,
          assets,
        )

        const supportedBuyAssetIds = sortedAssetIds.filter(assetId =>
          supportedBuyAssetsSet.has(assetId),
        )

        return {
          data: {
            supportedSellAssetIds,
            supportedBuyAssetIds,
          },
        }
      },
      providesTags: [],
    }),
  }),
})

export const { useGetTradeQuoteQuery, useGetSupportedAssetsQuery, useGetIsTradingActiveQuery } =
  swapperApi
