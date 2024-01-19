import type { skipToken } from '@reduxjs/toolkit/dist/query'
import type { GetTradeQuoteInput, SwapperName } from '@shapeshiftoss/swapper'
import { useMemo } from 'react'
import { useGetTradeQuoteQuery } from 'state/apis/swapper/swapperApi'

export const useGetSwapperTradeQuote = (
  swapperName: SwapperName,
  tradeQuoteInput: GetTradeQuoteInput | typeof skipToken,
  skip: boolean,
  pollingInterval: number | undefined,
) => {
  const tradeQuoteRequest = useMemo(() => {
    return Object.assign({}, tradeQuoteInput, { swapperName })
  }, [swapperName, tradeQuoteInput])

  const { isFetching, error } = useGetTradeQuoteQuery(tradeQuoteRequest, {
    skip,
    pollingInterval,
    /*
    If we don't refresh on arg change might select a cached result with an old "started_at" timestamp
    We can remove refetchOnMountOrArgChange if we want to make better use of the cache, and we have a better way to select from the cache.
    */
    refetchOnMountOrArgChange: true,
  })

  return { isFetching, error }
}
