import { arbitrumChainId } from '@shapeshiftoss/caip'
import { useQueries } from '@tanstack/react-query'

import {
  getUnstakingRequestCountQueryKey,
  newGetUnstakingRequestCountQueryFn,
} from './useGetUnstakingRequestCountQuery'
import { supportedStakingAssetIds } from './useRfoxContext'

import { mergeQueryOutputs } from '@/react-queries/helpers'
import { selectAccountIdsByChainIdFilter } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export const useGetAllUnstakingCountsQuery = () => {
  const stakingAssetAccountIds = useAppSelector(state =>
    selectAccountIdsByChainIdFilter(state, { chainId: arbitrumChainId }),
  )

  // First, get the query count for all accounts
  const unstakingRequestCountQueries = useQueries({
    queries: (stakingAssetAccountIds ?? []).flatMap(stakingAssetAccountId =>
      supportedStakingAssetIds.map(
        stakingAssetId =>
          ({
            queryKey: getUnstakingRequestCountQueryKey({
              stakingAssetAccountId,
              stakingAssetId,
            }),
            queryFn: newGetUnstakingRequestCountQueryFn({
              stakingAssetAccountId,
              stakingAssetId,
            }),
          }) as const,
      ),
    ),
    combine: queries => {
      const combineResults = results => results.flatMap(x => x)

      return mergeQueryOutputs(queries, combineResults)
    },
  })

  console.log({ unstakingRequestCountQueries })
  // Right now, this just gives up a count. This also uses the existing methods which is the bane of our existence as this is painful to read and work with
  // Next up:
  // 1. declare queryKey and queryFn in scope for ease of devving this (can be moved after)
  // 2. make it so it gives us count, accountId, stakingAssetId
  // 3. build a new useGetUnstakingRequests() which will consume this and will do the fn params building and multicall inline, this will make things 10x easier to read and save my sanity
  // 4. ???
  // 5. return a mapping of AccountId to unstaking requests and PROFIT
  // Then when it all works nicely, we can consume it in place of our existing useGetUnstakingRequestsQuery, and simply introspect by AccountId - yes this will be slightly heavier for multi-account,
  // but also more sane
  return unstakingRequestCountQueries
}
