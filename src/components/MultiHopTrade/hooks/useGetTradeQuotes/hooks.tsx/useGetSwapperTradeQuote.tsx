import { skipToken } from '@reduxjs/toolkit/dist/query'
import type { GetTradeQuoteInput, SwapperName } from '@shapeshiftoss/swapper'
import { useMemo } from 'react'
import { swapperApi, useGetTradeQuoteQuery } from 'state/apis/swapper/swapperApi'

export const useGetSwapperTradeQuote = (
  swapperName: SwapperName,
  tradeQuoteInput: GetTradeQuoteInput | typeof skipToken,
  skip: boolean,
  pollingInterval: number | undefined,
) => {
  const tradeQuoteRequest = useMemo(() => {
    return skip || tradeQuoteInput === skipToken
      ? skipToken
      : Object.assign({}, tradeQuoteInput, { swapperName })
  }, [skip, swapperName, tradeQuoteInput])

  useGetTradeQuoteQuery(tradeQuoteRequest, {
    skip,
    pollingInterval,
    // If we don't refresh on arg change might select a cached result with an old "started_at" timestamp
    // We can remove refetchOnMountOrArgChange if we want to make better use of the cache, and we have a better way to select from the cache.
    refetchOnMountOrArgChange: true,
  })

  // skip tokens invalidate loading state of the original useGetTradeQuoteQuery hook
  // so to persist fetching state after an inflight requests becomes skipped, we need to
  // read the request status and cached data from the Redux store
  // https://redux-toolkit.js.org/rtk-query/api/created-api/hooks#usequerystate
  const { isFetching, error } = swapperApi.endpoints.getTradeQuote.useQueryState(
    Object.assign({}, tradeQuoteInput, { swapperName }),
  )

  return { isFetching, error }
}
