import { createApi } from '@reduxjs/toolkit/dist/query/react'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import orderBy from 'lodash/orderBy'
import type { GetTradeQuoteInput } from 'lib/swapper/api'
import { getTradeQuotes } from 'lib/swapper/swapper'
import type { TradeQuoteDeps } from 'lib/swapper/types'
import { getEnabledSwappers } from 'lib/swapper/utils'
import { getInputOutputRatioFromQuote } from 'state/apis/swappers/helpers/getInputOutputRatioFromQuote'
import type { ApiQuote } from 'state/apis/swappers/types'
import type { ReduxState } from 'state/reducer'
import { selectAssets, selectFeeAssetById } from 'state/slices/assetsSlice/selectors'
import { marketApi } from 'state/slices/marketDataSlice/marketDataSlice'
import { selectUsdRateByAssetId } from 'state/slices/marketDataSlice/selectors'
import type { FeatureFlags } from 'state/slices/preferencesSlice/preferencesSlice'
import { selectFeatureFlags } from 'state/slices/selectors'

import { BASE_RTK_CREATE_API_CONFIG } from '../const'

const getDependencies = (
  state: ReduxState,
  getTradeQuoteInput: GetTradeQuoteInput,
): TradeQuoteDeps => {
  const assets = selectAssets(state)
  const feeAsset = selectFeeAssetById(state, getTradeQuoteInput.sellAsset.assetId)

  const sellAssetUsdRate = selectUsdRateByAssetId(state, getTradeQuoteInput.sellAsset.assetId)
  const buyAssetUsdRate = selectUsdRateByAssetId(state, getTradeQuoteInput.buyAsset.assetId)
  const feeAssetUsdRate = feeAsset ? selectUsdRateByAssetId(state, feeAsset.assetId) : undefined
  const runeAssetUsdRate = selectUsdRateByAssetId(state, thorchainAssetId)

  if (!sellAssetUsdRate) throw Error('missing sellAssetUsdRate')
  if (!buyAssetUsdRate) throw Error('missing buyAssetUsdRate')
  if (!feeAssetUsdRate) throw Error('missing feeAssetUsdRate')
  if (!runeAssetUsdRate) throw Error('missing runeAssetUsdRate')

  return {
    assets,
    sellAssetUsdRate,
    buyAssetUsdRate,
    feeAssetUsdRate,
    runeAssetUsdRate,
  }
}

export const swappersApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'swappersApi',
  keepUnusedDataFor: Number.MAX_SAFE_INTEGER, // never clear, we will manage this
  endpoints: build => ({
    getTradeQuote: build.query<ApiQuote[], GetTradeQuoteInput>({
      queryFn: async (getTradeQuoteInput: GetTradeQuoteInput, { dispatch, getState }) => {
        const state = getState() as ReduxState
        const { sendAddress, receiveAddress } = getTradeQuoteInput
        const isCrossAccountTrade = sendAddress !== receiveAddress
        const featureFlags: FeatureFlags = selectFeatureFlags(state)
        const enabledSwappers = getEnabledSwappers(featureFlags, isCrossAccountTrade)

        // Await market data fetching thunk, to ensure we can display some USD rate and don't bail in getDependencies above
        await dispatch(
          marketApi.endpoints.findByAssetId.initiate(getTradeQuoteInput.sellAsset.assetId),
        )
        await dispatch(
          marketApi.endpoints.findByAssetId.initiate(getTradeQuoteInput.buyAsset.assetId),
        )

        // We need to get the freshest state after fetching market data above
        const deps = getDependencies(getState() as ReduxState, getTradeQuoteInput)

        const quoteResults = await getTradeQuotes(getTradeQuoteInput, enabledSwappers, deps)

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

        const orderedQuotes: ApiQuote[] = orderBy(
          quotesWithInputOutputRatios,
          ['inputOutputRatio', 'swapperName'],
          ['desc', 'asc'],
        ).map((apiQuote, index) => Object.assign(apiQuote, { index }))

        return { data: orderedQuotes }
      },
    }),
  }),
})

export const { useGetTradeQuoteQuery } = swappersApi
