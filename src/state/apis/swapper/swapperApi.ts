import { createApi } from '@reduxjs/toolkit/query/react'
import { solAssetId } from '@shapeshiftoss/caip'
import type { GetTradeRateInput, SwapperName } from '@shapeshiftoss/swapper'
import { getTradeQuotes, getTradeRates } from '@shapeshiftoss/swapper'
import { mapValues } from 'lodash'

import { BASE_RTK_CREATE_API_CONFIG } from '../const'
import {
  createApiQuote,
  createSwapperDeps,
  hydrateMarketData,
  processQuoteResultWithRatios,
} from './helpers/swapperApiHelpers'

import type { ApiQuote, TradeQuoteOrRateRequest } from '@/state/apis/swapper/types'
import { getEnabledSwappers } from '@/state/helpers'
import type { ReduxState } from '@/state/reducer'
import type { FeatureFlags } from '@/state/slices/preferencesSlice/preferencesSlice'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'

export const BULK_FETCH_RATE_TIMEOUT_MS = 5000

export const swapperApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'swapperApi',
  keepUnusedDataFor: Number.MAX_SAFE_INTEGER, // never clear, we will manage this
  tagTypes: ['TradeQuote'],
  endpoints: build => ({
    getTradeQuote: build.query<Record<string, ApiQuote>, TradeQuoteOrRateRequest>({
      queryFn: async (tradeQuoteInput: TradeQuoteOrRateRequest, { dispatch, getState }) => {
        const state = getState() as ReduxState
        const {
          swapperName,
          sendAddress,
          receiveAddress,
          sellAsset,
          buyAsset,
          affiliateBps,
          sellAmountIncludingProtocolFeesCryptoBaseUnit,
          quoteOrRate,
        } = tradeQuoteInput

        const isSolBuyAssetId = buyAsset.assetId === solAssetId
        const isCrossAccountTrade =
          Boolean(sendAddress && receiveAddress) &&
          sendAddress?.toLowerCase() !== receiveAddress?.toLowerCase()
        const featureFlags: FeatureFlags = preferences.selectors.selectFeatureFlags(state)
        const isSwapperEnabled = getEnabledSwappers(
          featureFlags,
          isCrossAccountTrade,
          isSolBuyAssetId,
        )[swapperName]

        if (!isSwapperEnabled) return { data: {} }

        // hydrate crypto market data for buy and sell assets
        await hydrateMarketData(dispatch, sellAsset.assetId, buyAsset.assetId)

        const swapperDeps = createSwapperDeps(state)

        const getQuoteResult = () => {
          if (quoteOrRate === 'rate') {
            return getTradeRates(
              {
                ...tradeQuoteInput,
                affiliateBps,
              } as GetTradeRateInput,
              swapperName,
              swapperDeps,
            )
          }

          if (!tradeQuoteInput.receiveAddress) {
            throw new Error('Cannot get a trade quote without a receive address')
          }

          return getTradeQuotes(
            {
              ...tradeQuoteInput,
              affiliateBps,
            },
            swapperName,
            swapperDeps,
          )
        }

        const quoteResult = await getQuoteResult()

        if (quoteResult === undefined) {
          return { data: {} }
        }

        const quoteWithInputOutputRatios = processQuoteResultWithRatios(quoteResult, getState)

        const unorderedQuotes: ApiQuote[] = await Promise.all(
          quoteWithInputOutputRatios.map(quoteData =>
            createApiQuote(quoteData, state, {
              sellAssetId: sellAsset.assetId,
              buyAssetId: buyAsset.assetId,
              sendAddress,
              sellAmountIncludingProtocolFeesCryptoBaseUnit,
              quoteOrRate: tradeQuoteInput.quoteOrRate,
            }),
          ),
        )

        const tradeQuotesById = unorderedQuotes.reduce(
          (acc, quoteData) => {
            acc[quoteData.id] = quoteData
            return acc
          },
          {} as Record<string, ApiQuote>,
        )

        return { data: tradeQuotesById }
      },
      providesTags: (_result, _error, tradeQuoteRequest) => [
        { type: 'TradeQuote' as const, id: tradeQuoteRequest.swapperName },
      ],
    }),
    getTradeRates: build.query<Record<SwapperName, Record<string, ApiQuote>>, GetTradeRateInput>({
      queryFn: async (batchRequest: GetTradeRateInput, { dispatch, getState }) => {
        const state = getState() as ReduxState
        const {
          sendAddress,
          sellAsset,
          buyAsset,
          affiliateBps,
          sellAmountIncludingProtocolFeesCryptoBaseUnit,
        } = batchRequest

        const isSolBuyAssetId = buyAsset.assetId === solAssetId

        // No send address so always false
        const isCrossAccountTrade = false

        const featureFlags: FeatureFlags = preferences.selectors.selectFeatureFlags(state)
        const enabledSwappers = getEnabledSwappers(
          featureFlags,
          isCrossAccountTrade,
          isSolBuyAssetId,
        )

        const enabledSwapperNames = (Object.keys(enabledSwappers) as SwapperName[]).filter(
          name => enabledSwappers[name],
        )

        // Hydrate crypto market data for buy and sell assets once for all swappers
        await hydrateMarketData(dispatch, sellAsset.assetId, buyAsset.assetId)

        const swapperDeps = createSwapperDeps(state)

        const swapperResults = await Promise.allSettled(
          enabledSwapperNames.map(async swapperName => {
            const rateResult = await getTradeRates(
              {
                ...batchRequest,
                affiliateBps,
              } as GetTradeRateInput,
              swapperName,
              swapperDeps,
              BULK_FETCH_RATE_TIMEOUT_MS,
            )

            if (rateResult === undefined) {
              return { data: {} }
            }

            const quotesWithInputOutputRatios = processQuoteResultWithRatios(rateResult, getState)

            const processedQuotes: ApiQuote[] = await Promise.all(
              quotesWithInputOutputRatios.map(quoteData =>
                createApiQuote(quoteData, state, {
                  sellAssetId: sellAsset.assetId,
                  buyAssetId: buyAsset.assetId,
                  sendAddress,
                  sellAmountIncludingProtocolFeesCryptoBaseUnit,
                  quoteOrRate: 'rate',
                }),
              ),
            )

            return { swapperName, quotes: processedQuotes }
          }),
        )

        // Aggregate results by swapper, init to empty
        const result = mapValues(enabledSwappers, () => ({}))

        swapperResults.forEach(promiseResult => {
          if (promiseResult.status !== 'fulfilled') return

          const { quotes, swapperName } = promiseResult.value

          if (quotes === undefined) return

          result[swapperName] = quotes.reduce(
            (acc, quote) => {
              acc[quote.id] = quote
              return acc
            },
            {} as Record<string, ApiQuote>,
          )
        })

        return { data: result }
      },
      providesTags: ['TradeQuote'],
    }),
  }),
})

export const { useGetTradeQuoteQuery, useGetTradeRatesQuery } = swapperApi
