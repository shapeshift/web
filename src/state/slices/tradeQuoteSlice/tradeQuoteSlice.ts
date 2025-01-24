import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import type { SwapperName } from '@shapeshiftoss/swapper'
import { orderBy, uniqBy } from 'lodash'
import type { ApiQuote } from 'state/apis/swapper/types'

import { initialState } from './constants'

export const tradeQuote = createSlice({
  name: 'tradeQuote',
  initialState,
  reducers: {
    clear: () => ({
      ...initialState,
    }),
    clearTradeQuotes: state => ({
      ...initialState,
      activeQuoteMeta: state.activeQuoteMeta, // Leave the trade execution state alone, or we'll lose the active quote when backing out from preview
    }),
    setIsTradeQuoteRequestAborted: (state, action: PayloadAction<boolean>) => {
      state.isTradeQuoteRequestAborted = action.payload
    },
    upsertTradeQuotes: (
      state,
      action: PayloadAction<{
        swapperName: SwapperName
        quotesById: Record<string, ApiQuote> | undefined
      }>,
    ) => {
      const { swapperName, quotesById } = action.payload
      state.tradeQuotes[swapperName] = quotesById ?? {}
    },
    setActiveQuote: (state, action: PayloadAction<ApiQuote | undefined>) => {
      if (action.payload === undefined) {
        state.activeQuoteMeta = undefined
      } else {
        const { swapperName, id } = action.payload
        state.activeQuoteMeta = {
          swapperName,
          identifier: id,
        }
      }
    },
    updateTradeQuoteDisplayCache: (
      state,
      action: PayloadAction<{
        isTradeQuoteApiQueryPending: Partial<Record<SwapperName, boolean>>
        isSwapperQuoteAvailable: Record<SwapperName, boolean>
        sortedQuotes: ApiQuote[]
      }>,
    ) => {
      const { isTradeQuoteApiQueryPending, isSwapperQuoteAvailable, sortedQuotes } = action.payload

      // Mark stale quotes as stale.
      // Assign the original array index so we can keep loading quotes roughly in their original spot
      // in the list. This makes loading state less jarring visually because quotes tend to move
      // around less as results arrive.
      const staleQuotes = state.tradeQuoteDisplayCache
        .map((quoteData, originalIndex) => {
          return Object.assign({}, quoteData, { isStale: true, originalIndex })
        })
        .filter(quoteData => {
          return (
            isTradeQuoteApiQueryPending[quoteData.swapperName] ||
            !isSwapperQuoteAvailable[quoteData.swapperName]
          )
        })

      const sortedQuotesWithOriginalIndex = sortedQuotes.map((quoteData, originalIndex) => {
        return Object.assign({}, quoteData, { isStale: false, originalIndex })
      })

      const allQuotes = uniqBy(sortedQuotesWithOriginalIndex.concat(staleQuotes), 'id')

      const sortQuotes = (
        unorderedQuotes: ({ originalIndex: number } & ApiQuote)[],
      ): ApiQuote[] => {
        return orderBy(
          unorderedQuotes,
          ['originalIndex', 'inputOutputRatio', 'swapperName'],
          ['asc', 'desc', 'asc'],
        )
      }

      const happyQuotes = sortQuotes(allQuotes.filter(({ errors }) => errors.length === 0))
      const errorQuotes = sortQuotes(allQuotes.filter(({ errors }) => errors.length > 0))

      state.tradeQuoteDisplayCache = happyQuotes.concat(errorQuotes)
    },
  },
})
