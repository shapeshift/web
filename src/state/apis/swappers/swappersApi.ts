import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { Result } from '@sniptt/monads'
import { orderBy } from 'lodash'
import type { GetTradeQuoteInput, SwapErrorRight, TradeQuote2 } from 'lib/swapper/api'
import { SwapperName } from 'lib/swapper/api'
import { getInputOutputRatioFromQuote } from 'state/apis/swappers/helpers/getInputOutputRatioFromQuote'
import { getLifiTradeQuoteHelper } from 'state/apis/swappers/helpers/getLifiTradeQuoteApiHelper'
import { getThorTradeQuoteHelper } from 'state/apis/swappers/helpers/getThorTradeQuoteApiHelper'
import type { ApiQuote } from 'state/apis/swappers/types'
import { isCrossAccountTradeSupported } from 'state/helpers'
import type { ReduxState } from 'state/reducer'
import type { FeatureFlags } from 'state/slices/preferencesSlice/preferencesSlice'
import { selectFeatureFlags } from 'state/slices/selectors'

import { BASE_RTK_CREATE_API_CONFIG } from '../const'
import { getZrxTradeQuoteHelper } from './helpers/getZrxTradeQuoteHelper'

export const swappersApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'swappersApi',
  keepUnusedDataFor: Number.MAX_SAFE_INTEGER, // never clear, we will manage this
  endpoints: build => ({
    getTradeQuote: build.query<ApiQuote[], GetTradeQuoteInput>({
      queryFn: async (getTradeQuoteInput: GetTradeQuoteInput, { getState }) => {
        const state = getState() as ReduxState
        const { sendAddress, receiveAddress } = getTradeQuoteInput
        const isCrossAccountTrade = sendAddress !== receiveAddress
        const { LifiSwap, ThorSwap, ZrxSwap }: FeatureFlags = selectFeatureFlags(state)
        const quotes: (Result<TradeQuote2, SwapErrorRight> & {
          swapperName: SwapperName
        })[] = []
        const quoteHelperArgs = [getTradeQuoteInput, state] as const
        if (LifiSwap)
          try {
            const lifiTradeQuote: Result<TradeQuote2, SwapErrorRight> =
              await getLifiTradeQuoteHelper(...quoteHelperArgs)
            quotes.push({
              ...lifiTradeQuote,
              swapperName: SwapperName.LIFI,
            })
          } catch (error) {
            console.error('[getLifiTradeQuoteHelper]', error)
          }
        if (ThorSwap)
          try {
            const thorTradeQuote: Result<TradeQuote2, SwapErrorRight> =
              await getThorTradeQuoteHelper(...quoteHelperArgs)
            quotes.push({
              ...thorTradeQuote,
              swapperName: SwapperName.Thorchain,
            })
          } catch (error) {
            console.error('[getThorTradeQuoteHelper]', error)
          }
        if (ZrxSwap)
          try {
            const zrxTradeQuote: Result<TradeQuote2, SwapErrorRight> = await getZrxTradeQuoteHelper(
              ...quoteHelperArgs,
            )
            quotes.push({
              ...zrxTradeQuote,
              swapperName: SwapperName.Zrx,
            })
          } catch (error) {
            console.error('[zrx.getTradeQuote]', error)
          }
        const quotesWithInputOutputRatios = quotes
          .map(result => {
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
          .filter(result => {
            const swapperSupportsCrossAccountTrade = isCrossAccountTradeSupported(
              result.swapperName,
            )
            return !isCrossAccountTrade || swapperSupportsCrossAccountTrade
          })
        const orderedQuotes: ApiQuote[] = orderBy(
          quotesWithInputOutputRatios,
          ['inputOutputRatio', 'swapperName'],
          ['desc', 'asc'],
        )

        // TODO: this causes a circular dependency
        // // if the active swapper name doesn't exist in the returned quotes, reset it
        // const activeSwapperName = selectActiveSwapperName(state)
        // if (!orderedQuotes.some(apiQuote => apiQuote.swapperName === activeSwapperName)) {
        //   dispatch(tradeQuoteSlice.actions.resetSwapperName())
        // }

        return { data: orderedQuotes }
      },
    }),
  }),
})

export const { useGetTradeQuoteQuery } = swappersApi
