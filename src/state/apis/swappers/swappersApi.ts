import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { Result } from '@sniptt/monads'
import { orderBy } from 'lodash'
import type { GetTradeQuoteInput, SwapErrorRight, TradeQuote2 } from 'lib/swapper/api'
import { SwapperName } from 'lib/swapper/api'
import { getLifiTradeQuoteHelper } from 'state/apis/swappers/getLifiTradeQuoteHelper'
import { getThorTradeQuoteHelper } from 'state/apis/swappers/getThorTradeQuoteHelper'
import { getInputOutputRatioFromQuote } from 'state/apis/swappers/helpers/getInputOutputRatioFromQuote'
import type { ApiQuote } from 'state/apis/swappers/types'
import type { ReduxState } from 'state/reducer'
import type { FeatureFlags } from 'state/slices/preferencesSlice/preferencesSlice'
import { selectFeatureFlags } from 'state/slices/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'

import { BASE_RTK_CREATE_API_CONFIG } from '../const'

export const swappersApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'swappersApi',
  endpoints: build => ({
    getTradeQuote: build.query<ApiQuote[], GetTradeQuoteInput>({
      queryFn: async (getTradeQuoteInput: GetTradeQuoteInput, { getState, dispatch }) => {
        const state = getState() as ReduxState
        const { LifiSwap, ThorSwap }: FeatureFlags = selectFeatureFlags(state)
        const quotes: (Result<TradeQuote2, SwapErrorRight> & {
          swapperName: SwapperName
        })[] = []
        const quoteHelperArgs = [getTradeQuoteInput, state] as const
        if (LifiSwap)
          quotes.push({
            ...(await getLifiTradeQuoteHelper(...quoteHelperArgs)),
            swapperName: SwapperName.LIFI,
          })
        if (ThorSwap)
          quotes.push({
            ...(await getThorTradeQuoteHelper(...quoteHelperArgs)),
            swapperName: SwapperName.Thorchain,
          })
        const quotesWithInputOutputRatios = quotes.map(result => {
          const quote = result && result.isOk() ? result.unwrap() : undefined
          const error = result && result.isErr() ? result.unwrapErr() : undefined
          const inputOutputRatio = quote
            ? getInputOutputRatioFromQuote({
                state,
                quote,
                swapperName: result.swapperName,
              })
            : -Infinity
          return { quote, error, inputOutputRatio, swapperName: result.swapperName }
        })
        const orderedQuotes: ApiQuote[] = orderBy(
          quotesWithInputOutputRatios,
          ['inputOutputRatio', 'swapperName'],
          ['asc', 'asc'],
        )

        const bestQuote = orderedQuotes[0]
        dispatch(tradeQuoteSlice.actions.setSwapperName(bestQuote.swapperName))
        dispatch(tradeQuoteSlice.actions.setQuotes(orderedQuotes))

        return { data: orderedQuotes }
      },
    }),
  }),
})

export const { useGetTradeQuoteQuery } = swappersApi
