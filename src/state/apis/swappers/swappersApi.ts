import { createApi } from '@reduxjs/toolkit/dist/query/react'
import orderBy from 'lodash/orderBy'
import { getTradeQuotes } from 'lib/swapper/swapper'
import type { GetTradeQuoteInput } from 'lib/swapper/types'
import { SwapperName } from 'lib/swapper/types'
import { getEnabledSwappers } from 'lib/swapper/utils'
import { getInputOutputRatioFromQuote } from 'state/apis/swappers/helpers/getInputOutputRatioFromQuote'
import type { ApiQuote } from 'state/apis/swappers/types'
import type { ReduxState } from 'state/reducer'
import { marketApi } from 'state/slices/marketDataSlice/marketDataSlice'
import { selectUsdRateByAssetId } from 'state/slices/marketDataSlice/selectors'
import type { FeatureFlags } from 'state/slices/preferencesSlice/preferencesSlice'
import { selectFeatureFlags } from 'state/slices/selectors'

import { BASE_RTK_CREATE_API_CONFIG } from '../const'
import { getIsDonationAmountBelowMinimum } from './helpers/getIsDonationAmountBelowMinimum'

// these are the swappers with special logic regarding minimum donations
const evmDonationSwappers = [SwapperName.OneInch, SwapperName.Zrx, SwapperName.LIFI]

export const swappersApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'swappersApi',
  keepUnusedDataFor: Number.MAX_SAFE_INTEGER, // never clear, we will manage this
  endpoints: build => ({
    getTradeQuote: build.query<ApiQuote[], GetTradeQuoteInput>({
      queryFn: async (getTradeQuoteInput: GetTradeQuoteInput, { dispatch, getState }) => {
        const state = getState() as ReduxState
        const {
          sendAddress,
          receiveAddress,
          sellAsset,
          buyAsset,
          affiliateBps,
          sellAmountIncludingProtocolFeesCryptoBaseUnit,
        } = getTradeQuoteInput
        const isCrossAccountTrade = sendAddress !== receiveAddress
        const featureFlags: FeatureFlags = selectFeatureFlags(state)
        const sellAssetUsdRate = selectUsdRateByAssetId(state, getTradeQuoteInput.sellAsset.assetId)
        const enabledSwappers = getEnabledSwappers(featureFlags, isCrossAccountTrade)

        if (!sellAssetUsdRate) throw Error('missing sellAssetUsdRate')

        // Await market data fetching thunk, to ensure we can display some USD rate and don't bail in getDependencies above
        await dispatch(marketApi.endpoints.findByAssetId.initiate(sellAsset.assetId))
        await dispatch(marketApi.endpoints.findByAssetId.initiate(buyAsset.assetId))

        // We use the sell amount so we don't have to make 2 network requests, as the receive amount requires a quote
        const isDonationAmountBelowMinimum = getIsDonationAmountBelowMinimum(
          sellAmountIncludingProtocolFeesCryptoBaseUnit,
          sellAsset,
          sellAssetUsdRate,
        )

        const quoteResults = await Promise.all([
          getTradeQuotes(
            {
              ...getTradeQuoteInput,
              affiliateBps: isDonationAmountBelowMinimum ? '0' : affiliateBps,
            },
            enabledSwappers.filter(swapperName => evmDonationSwappers.includes(swapperName)),
          ),
          getTradeQuotes(
            getTradeQuoteInput,
            enabledSwappers.filter(swapperName => !evmDonationSwappers.includes(swapperName)),
          ),
        ])

        const quotesWithInputOutputRatios = quoteResults
          .flat()
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
