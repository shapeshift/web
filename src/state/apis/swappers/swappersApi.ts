import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { type AssetId, fromAssetId } from '@shapeshiftoss/caip'
import type { GetTradeQuoteInput } from '@shapeshiftoss/swapper'
import orderBy from 'lodash/orderBy'
import { bnOrZero } from 'lib/bignumber/bignumber'
import {
  getSupportedBuyAssetIds,
  getSupportedSellAssetIds,
  getTradeQuotes,
} from 'lib/swapper/swapper'
import { getEnabledSwappers } from 'lib/swapper/utils'
import { getInputOutputRatioFromQuote } from 'state/apis/swappers/helpers/getInputOutputRatioFromQuote'
import type { ApiQuote, TradeQuoteResponse } from 'state/apis/swappers/types'
import { TradeQuoteRequestError } from 'state/apis/swappers/types'
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
} from 'state/slices/swappersSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'

import { BASE_RTK_CREATE_API_CONFIG } from '../const'
import { prevalidateQuoteRequest } from './helpers/prevalidateQuoteRequest'
import { validateTradeQuote } from './helpers/validateTradeQuote'

export const GET_TRADE_QUOTE_POLLING_INTERVAL = 20_000
export const swappersApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'swappersApi',
  keepUnusedDataFor: Number.MAX_SAFE_INTEGER, // never clear, we will manage this
  tagTypes: ['TradeQuote'],
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
        const walletSupportedChains = selectWalletSupportedChainIds(state)
        const manualReceiveAddress = selectManualReceiveAddress(state)
        const firstHopSellAccountId = selectFirstHopSellAccountId(state)
        const sellAssetBalanceCryptoBaseUnit = selectPortfolioCryptoBalanceBaseUnitByFilter(state, {
          accountId: firstHopSellAccountId,
          assetId: tradeQuoteInput.sellAsset.assetId,
        })

        const topLevelValidationErrors = await prevalidateQuoteRequest({
          tradeQuoteInput,
          isWalletConnected,
          walletSupportedChains,
          manualReceiveAddress,
          sellAssetBalanceCryptoBaseUnit,
        })

        if (topLevelValidationErrors.length > 0) {
          dispatch(tradeQuoteSlice.actions.setActiveQuoteIndex(undefined))
          return { data: { errors: topLevelValidationErrors, quotes: [] } }
        }

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
              errors: [{ error: TradeQuoteRequestError.NoQuotesAvailable }],
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
            const errors = await validateTradeQuote(state, {
              swapperName,
              quote,
              error,
            })
            return {
              quote,
              swapperName,
              inputOutputRatio,
              errors,
            }
          }),
        )

        const orderedQuotes: ApiQuote[] = orderBy(
          unorderedQuotes,
          ['inputOutputRatio', 'swapperName'],
          ['desc', 'asc'],
        ).map((apiQuote, index) => Object.assign(apiQuote, { index }))

        const firstActionableQuote = orderedQuotes.find(apiQuote => apiQuote.errors.length === 0)

        // Ensure we auto-select the first actionable quote
        dispatch(tradeQuoteSlice.actions.setActiveQuoteIndex(firstActionableQuote?.index ?? 0))
        return { data: { errors: [], quotes: orderedQuotes } }
      },
      providesTags: ['TradeQuote'],
    }),
    getSupportedAssets: build.query<
      {
        supportedSellAssetIds: AssetId[]
        supportedBuyAssetIds: AssetId[]
      },
      { walletSupportedChains: ChainId[]; sortedAssetIds: AssetId[] }
    >({
      queryFn: async (
        {
          walletSupportedChains,
          sortedAssetIds,
        }: { walletSupportedChains: ChainId[]; sortedAssetIds: AssetId[] },
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
            return walletSupportedChains.includes(chainId)
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

export const { useGetTradeQuoteQuery, useGetSupportedAssetsQuery } = swappersApi
