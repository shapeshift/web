import type { AccountId } from '@shapeshiftoss/caip'
import { arbitrumChainId } from '@shapeshiftoss/caip'
import { useQueries } from '@tanstack/react-query'

import { supportedStakingAssetIds } from '../useRfoxContext'
import type { UnstakingRequestAccountAssetData } from './utils'
import { getUnstakingRequestsQueryFn } from './utils'

import { isSome } from '@/lib/utils'
import { mergeQueryOutputs } from '@/react-queries/helpers'
import { selectAccountIdsByChainIdFilter } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export const useGetUnstakingRequestsQuery = () => {
  // This always fetches unstaking data for all Arb AccountIds - consumers can filter by accountId as-needed
  // but this avoids the complexity, while supporting multi-account and making the chain switch seamless (no further loading needed)
  const stakingAssetAccountIds = useAppSelector(state =>
    selectAccountIdsByChainIdFilter(state, { chainId: arbitrumChainId }),
  )

  // This fetches the request count for all AccountIds over each supported contract
  // Then, once a count is gotten, this does a multicall on each contract for each account to fetch unstaking requests at all indexes
  const unstakingRequestsQueries = useQueries({
    queries: (stakingAssetAccountIds ?? []).flatMap(stakingAssetAccountId =>
      supportedStakingAssetIds.map(
        stakingAssetId =>
          ({
            queryKey: ['getUnstakingRequests', { stakingAssetAccountId, stakingAssetId }],
            queryFn: getUnstakingRequestsQueryFn({
              stakingAssetAccountId,
              stakingAssetId,
            }),
          }) as const,
      ),
    ),
    combine: queries => {
      const combineResults = (results: (UnstakingRequestAccountAssetData | undefined)[]) => {
        const byAccountId = (results ?? [])
          .filter(isSome)
          .reduce<Record<AccountId, UnstakingRequestAccountAssetData['unstakingRequests']>>(
            (acc, current) => {
              const stakingAssetAccountId = current.stakingAssetAccountId

              if (!acc[stakingAssetAccountId]) {
                acc[stakingAssetAccountId] = []
              }

              acc[stakingAssetAccountId] = [
                ...acc[stakingAssetAccountId],
                ...current.unstakingRequests,
              ]
              return acc
            },
            {},
          )

        const all = Object.values(byAccountId).flat().filter(isSome)

        return { byAccountId, all }
      }

      return mergeQueryOutputs(queries, combineResults)
    },
  })

  return unstakingRequestsQueries
}
