import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { type AssetId, fromAssetId } from '@shapeshiftoss/caip'
import type { GetTradeQuoteInput, SwapperName } from '@shapeshiftoss/swapper'
import orderBy from 'lodash/orderBy'
import { isTradingActive } from 'components/MultiHopTrade/utils'
import { bnOrZero } from 'lib/bignumber/bignumber'
import {
  getSupportedBuyAssetIds,
  getSupportedSellAssetIds,
  getTradeQuotes,
} from 'lib/swapper/swapper'
import { getEnabledSwappers } from 'lib/swapper/utils'
import { getInputOutputRatioFromQuote } from 'state/apis/swapper/helpers/getInputOutputRatioFromQuote'
import type { ApiQuote, TradeQuoteResponse } from 'state/apis/swapper/types'
import { TradeQuoteRequestError, TradeQuoteValidationError } from 'state/apis/swapper/types'
import type { ReduxState } from 'state/reducer'
import { selectAssets } from 'state/slices/assetsSlice/selectors'
import {
  selectIsWalletConnected,
  selectPortfolioCryptoBalanceBaseUnitByFilter,
  selectWalletSupportedChainIds,
} from 'state/slices/common-selectors'
import { marketApi } from 'state/slices/marketDataSlice/marketDataSlice'
import { selectUsdRateByAssetId } from 'state/slices/marketDataSlice/selectors'
import type { FeatureFlags } from 'state/slices/preferencesSlice/preferencesSlice'
import { selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'
import {
  selectFirstHopSellAccountId,
  selectManualReceiveAddress,
  selectSellAsset,
} from 'state/slices/tradeInputSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'

import { BASE_RTK_CREATE_API_CONFIG } from '../const'
import { apiErrorHandler } from '../utils'
import { validateQuoteRequest } from './helpers/validateQuoteRequest'
import { validateTradeQuote } from './helpers/validateTradeQuote'

const sortQuotes = (unorderedQuotes: Omit<ApiQuote, 'index'>[], startingIndex: number) => {
  return orderBy(unorderedQuotes, ['inputOutputRatio', 'swapperName'], ['desc', 'asc']).map(
    (apiQuote, i) => Object.assign(apiQuote, { index: startingIndex + i }),
  )
}

const getIsTradingActiveErrorHandler = apiErrorHandler(
  'getIsTradingActiveApi: error getting trading status',
)

export const GET_TRADE_QUOTE_POLLING_INTERVAL = 20_000
export const _swapperApi = createApi({
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

export const swapperApi = _swapperApi.injectEndpoints({
  endpoints: build => ({
    getTradeQuote: build.query<TradeQuoteResponse, GetTradeQuoteInput>({
      queryFn: async (tradeQuoteInput: GetTradeQuoteInput, { dispatch, getState }) => {
        if (bnOrZero(tradeQuoteInput.sellAmountIncludingProtocolFeesCryptoBaseUnit).isZero()) {
          dispatch(tradeQuoteSlice.actions.setActiveQuoteIndex(undefined))
          return { data: { errors: [], quotes: [] } }
        }

        const state = getState() as ReduxState
        const { sendAddress, receiveAddress, sellAsset, buyAsset, affiliateBps } = tradeQuoteInput
        const isCrossAccountTrade = sendAddress !== receiveAddress
        const featureFlags: FeatureFlags = selectFeatureFlags(state)
        const enabledSwappers = getEnabledSwappers(featureFlags, isCrossAccountTrade)
        const isWalletConnected = selectIsWalletConnected(state)
        const walletSupportedChainIds = selectWalletSupportedChainIds(state)
        const manualReceiveAddress = selectManualReceiveAddress(state)
        const firstHopSellAccountId = selectFirstHopSellAccountId(state)
        const sellAssetBalanceCryptoBaseUnit = selectPortfolioCryptoBalanceBaseUnitByFilter(state, {
          accountId: firstHopSellAccountId,
          assetId: tradeQuoteInput.sellAsset.assetId,
        })

        const topLevelValidationErrors = validateQuoteRequest({
          tradeQuoteInput,
          isWalletConnected,
          walletSupportedChainIds,
          manualReceiveAddress,
          sellAssetBalanceCryptoBaseUnit,
        })

        // hydrate crypto market data for buy and sell assets
        await dispatch(
          marketApi.endpoints.findByAssetIds.initiate([sellAsset.assetId, buyAsset.assetId]),
        )

        const sellAssetUsdRate = selectUsdRateByAssetId(state, tradeQuoteInput.sellAsset.assetId)

        // this should never be needed but here for paranoia
        if (!sellAssetUsdRate) throw Error('missing sellAssetUsdRate')

        const quoteResults = await getTradeQuotes(
          {
            ...tradeQuoteInput,
            affiliateBps,
          },
          enabledSwappers,
          selectAssets(state),
        )

        if (quoteResults.length === 0) {
          return {
            data: {
              errors: [
                { error: TradeQuoteRequestError.NoQuotesAvailable },
                ...topLevelValidationErrors,
              ],
              quotes: [],
            },
          }
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

            const { isTradingActiveOnSellPool, isTradingActiveOnBuyPool } = await (async () => {
              // allow swapper errors to flow through
              if (error !== undefined) {
                return { isTradingActiveOnSellPool: false, isTradingActiveOnBuyPool: false }
              }

              const [{ data: isTradingActiveOnSellPool }, { data: isTradingActiveOnBuyPool }] =
                await Promise.all(
                  [sellAsset.assetId, buyAsset.assetId].map(assetId => {
                    return dispatch(
                      _swapperApi.endpoints.getIsTradingActive.initiate({
                        assetId,
                        swapperName,
                      }),
                    )
                  }),
                )
              return {
                isTradingActiveOnSellPool,
                isTradingActiveOnBuyPool,
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

        // ensure quotes with errors are placed below actionable quotes
        const happyQuotes = sortQuotes(
          unorderedQuotes.filter(({ errors }) => errors.length === 0),
          0,
        )
        const errorQuotes = sortQuotes(
          unorderedQuotes.filter(({ errors }) => errors.length > 0),
          happyQuotes.length,
        )
        const orderedQuotes: ApiQuote[] = [...happyQuotes, ...errorQuotes]

        // Ensure we auto-select the first actionable quote, or nothing otherwise
        dispatch(
          tradeQuoteSlice.actions.setActiveQuoteIndex(happyQuotes.length > 0 ? 0 : undefined),
        )

        return {
          data: {
            errors: topLevelValidationErrors,
            quotes: orderedQuotes,
          },
        }
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
        const sellAsset = selectSellAsset(state)

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

export const { useGetTradeQuoteQuery, useGetSupportedAssetsQuery } = swapperApi
