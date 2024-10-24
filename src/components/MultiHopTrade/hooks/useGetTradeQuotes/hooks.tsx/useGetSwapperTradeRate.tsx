import { skipToken } from '@reduxjs/toolkit/dist/query'
import type { GetTradeRateInput, SwapperName } from '@shapeshiftoss/swapper'
import { useEffect, useMemo } from 'react'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { swapperApi, useGetTradeRateQuery } from 'state/apis/swapper/swapperApi'
import { useAppDispatch } from 'state/store'

export type UseGetSwapperTradeRateArgs = {
  swapperName: SwapperName
  // TODO(gomes): when we implement useGetTradeRates, this should be tradeRateInput
  tradeQuoteInput: GetTradeRateInput | typeof skipToken
  skip: boolean
  pollingInterval: number | undefined
}

export const useGetSwapperTradeRate = ({
  swapperName,
  tradeQuoteInput: tradeRateInput,
  pollingInterval,
  skip,
}: UseGetSwapperTradeRateArgs) => {
  const isPublicTradeRouteEnabled = useFeatureFlag('PublicTradeRoute')
  const dispatch = useAppDispatch()
  const tradeRateRequest = useMemo(() => {
    return skip || tradeRateInput === skipToken || !isPublicTradeRouteEnabled
      ? skipToken
      : Object.assign({}, tradeRateInput, { swapperName })
  }, [isPublicTradeRouteEnabled, skip, swapperName, tradeRateInput])

  const tradeRateOptions = useMemo(
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
    return tradeRateInput === skipToken
      ? skipToken
      : Object.assign({}, tradeRateInput, { swapperName })
  }, [swapperName, tradeRateInput])

  useGetTradeRateQuery(tradeRateRequest, tradeRateOptions)

  // skip tokens invalidate loading state of the original useGetTradeQuoteQuery hook
  // so to persist fetching state after an inflight request becomes skipped, we need to
  // read the request status and cached data from the Redux store
  // https://redux-toolkit.js.org/rtk-query/api/created-api/hooks#usequerystate
  const queryStateMeta = swapperApi.endpoints.getTradeRate.useQueryState(queryStateRequest)

  // Console log expected for the time being, since we don't consume this just yet, this allows us to ensure things are working as expected
  console.log({ queryStateMeta })

  useEffect(() => {
    // TODO(gomes): what do with trade rates, upsert them under the trade quotes umbrella?
    // dispatch(
    // tradeQuoteSlice.actions.upsertTradeQuotes({
    // swapperName,
    // quotesById: queryStateMeta.data,
    // }),
    // )
  }, [swapperName, dispatch, queryStateMeta.data])

  return queryStateMeta
}
