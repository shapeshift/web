import { createApi } from '@reduxjs/toolkit/dist/query/react'
import type { Result } from '@sniptt/monads'
import { Err } from '@sniptt/monads'
import { orderBy } from 'lodash'
import type { GetTradeQuoteInput, SwapErrorRight, TradeQuote2 } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapperName } from 'lib/swapper/api'
import { getInputOutputRatioFromQuote } from 'state/apis/swappers/helpers/getInputOutputRatioFromQuote'
import { getLifiTradeQuoteHelper } from 'state/apis/swappers/helpers/getLifiTradeQuoteApiHelper'
import { getThorTradeQuoteHelper } from 'state/apis/swappers/helpers/getThorTradeQuoteApiHelper'
import type { ApiQuote } from 'state/apis/swappers/types'
import { isCrossAccountTradeSupported } from 'state/helpers'
import type { ReduxState } from 'state/reducer'
import type { FeatureFlags } from 'state/slices/preferencesSlice/preferencesSlice'
import { selectFeatureFlags } from 'state/slices/selectors'

import { BASE_RTK_CREATE_API_CONFIG } from '../const'
import { getCowTradeQuoteHelper } from './helpers/getCowTradeQuoteHelper'
import { getOneInchTradeQuoteHelper } from './helpers/getOneInchTradeQuoteHelper'
import { getOsmosisTradeQuoteHelper } from './helpers/getOsmosisTradeQuoteApiHelper'
import { getZrxTradeQuoteHelper } from './helpers/getZrxTradeQuoteHelper'

const QUOTE_TIMEOUT_MS = 10_000

const TIMEOUT_ERROR = makeSwapErrorRight({
  message: `quote timed out after ${QUOTE_TIMEOUT_MS / 1000}s`,
})

const timeout = <Left, Right>(
  promise: Promise<Result<Left, Right>>,
  timeoutRight: Right,
): Promise<Result<Left, Right>> => {
  return Promise.race([
    promise,
    new Promise<Result<Left, Right>>(resolve =>
      setTimeout(() => {
        resolve(Err(timeoutRight) as Result<Left, Right>)
      }, QUOTE_TIMEOUT_MS),
    ),
  ])
}

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
        const { OsmosisSwap, LifiSwap, ThorSwap, ZrxSwap, OneInch, Cowswap }: FeatureFlags =
          selectFeatureFlags(state)

        const swappers = [
          {
            isEnabled: OsmosisSwap,
            swapperName: SwapperName.Osmosis,
            getTradeQuote: getOsmosisTradeQuoteHelper,
          },
          {
            isEnabled: LifiSwap,
            swapperName: SwapperName.LIFI,
            getTradeQuote: getLifiTradeQuoteHelper,
          },
          {
            isEnabled: ThorSwap,
            swapperName: SwapperName.Thorchain,
            getTradeQuote: getThorTradeQuoteHelper,
          },
          {
            isEnabled: ZrxSwap,
            swapperName: SwapperName.Zrx,
            getTradeQuote: getZrxTradeQuoteHelper,
          },
          {
            isEnabled: OneInch,
            swapperName: SwapperName.OneInch,
            getTradeQuote: getOneInchTradeQuoteHelper,
          },
          {
            isEnabled: Cowswap,
            swapperName: SwapperName.CowSwap,
            getTradeQuote: getCowTradeQuoteHelper,
          },
        ]

        const quotes = await Promise.all(
          swappers
            .filter(({ isEnabled }) => isEnabled)
            .map(({ swapperName, getTradeQuote }) =>
              timeout<TradeQuote2, SwapErrorRight>(
                getTradeQuote(getTradeQuoteInput, state),
                TIMEOUT_ERROR,
              ).then(quote => ({
                ...quote,
                swapperName,
              })),
            ),
        ).catch(e => {
          console.error(e)
          return []
        })

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
