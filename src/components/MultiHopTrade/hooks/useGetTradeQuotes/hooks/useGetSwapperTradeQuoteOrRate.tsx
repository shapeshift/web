import { skipToken } from '@reduxjs/toolkit/dist/query'
import type { GetTradeQuoteInput, SwapperName } from '@shapeshiftoss/swapper'
import { useEffect, useMemo } from 'react'
import { swapperApi, useGetTradeQuoteQuery } from 'state/apis/swapper/swapperApi'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { useAppDispatch } from 'state/store'

export type UseGetSwapperTradeQuoteOrRateArgs = {
  swapperName: SwapperName | undefined
  tradeQuoteInput: GetTradeQuoteInput | typeof skipToken
  skip: boolean
  pollingInterval: number | undefined
}

export const useGetSwapperTradeQuoteOrRate = ({
  swapperName,
  tradeQuoteInput,
  pollingInterval,
  skip,
}: UseGetSwapperTradeQuoteOrRateArgs) => {
  const dispatch = useAppDispatch()
  const tradeQuoteRequest = useMemo(() => {
    return skip || tradeQuoteInput === skipToken || !swapperName
      ? skipToken
      : Object.assign({}, tradeQuoteInput, { swapperName })
  }, [skip, swapperName, tradeQuoteInput])

  const tradeQuoteOptions = useMemo(
    () => ({
      skip,
      pollingInterval,
      // If we don't refresh on arg change might select a cached result with an old "started_at" timestamp
      // We can remove refetchOnMountOrArgChange if we want to make better use of the cache, and we have a better way to select from the cache.
      refetchOnMountOrArgChange: true,
    }),
    [pollingInterval, skip],
  )

  const queryStateRequest = useMemo(() => {
    return tradeQuoteInput === skipToken || !swapperName
      ? skipToken
      : Object.assign({}, tradeQuoteInput, { swapperName })
  }, [swapperName, tradeQuoteInput])

  useGetTradeQuoteQuery(tradeQuoteRequest, tradeQuoteOptions)

  // skip tokens invalidate loading state of the original useGetTradeQuoteQuery hook
  // so to persist fetching state after an inflight request becomes skipped, we need to
  // read the request status and cached data from the Redux store
  // https://redux-toolkit.js.org/rtk-query/api/created-api/hooks#usequerystate
  const queryStateMeta = swapperApi.endpoints.getTradeQuote.useQueryState(queryStateRequest)

  useEffect(() => {
    if (!swapperName) return
    // Ensures we don't rug the state by upserting undefined data  - this is *not* the place to do so and will rug the switch between quotes and rates
    if (!queryStateMeta.data) return
    dispatch(
      tradeQuoteSlice.actions.upsertTradeQuotes({
        swapperName,
        quotesById: queryStateMeta.data,
      }),
    )
  }, [swapperName, dispatch, queryStateMeta.data])

  return queryStateMeta
}
