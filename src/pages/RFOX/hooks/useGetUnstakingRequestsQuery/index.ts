import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { useQueries } from '@tanstack/react-query'
import { useMemo } from 'react'

import { getRfoxChainId } from '../../helpers'
import { supportedStakingAssetIds } from '../useRfoxContext'
import type { UnstakingRequestAccountAssetData } from './utils'
import { getUnstakingRequestsQueryFn } from './utils'

import { useWallet } from '@/hooks/useWallet/useWallet'
import { isSome } from '@/lib/utils'
import { mergeQueryOutputs } from '@/react-queries/helpers'
import { selectPortfolioLoadingStatus, selectWalletAccountIds } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export const useGetUnstakingRequestsQuery = () => {
  const portfolioLoadingStatus = useAppSelector(selectPortfolioLoadingStatus)

  const {
    state: { isLoadingLocalWallet, modal, isConnected },
  } = useWallet()
  const walletAccountIds = useAppSelector(selectWalletAccountIds)

  // This always fetches unstaking data for every AccountId on a chain rFOX stakes on - consumers can
  // filter by accountId as-needed but this avoids the complexity, while supporting multi-account and
  // making the chain switch seamless (no further loading needed). Each account is only paired with
  // the staking assets living on its own chain.
  const accountIdStakingAssetIdPairs = useMemo(
    () =>
      (walletAccountIds ?? []).flatMap(stakingAssetAccountId => {
        const { chainId } = fromAccountId(stakingAssetAccountId)

        return supportedStakingAssetIds
          .filter(stakingAssetId => getRfoxChainId(stakingAssetId) === chainId)
          .map(stakingAssetId => ({ stakingAssetAccountId, stakingAssetId }))
      }),
    [walletAccountIds],
  )

  // This fetches the request count for all AccountIds over each supported contract
  // Then, once a count is gotten, this does a multicall on each contract for each account to fetch unstaking requests at all indexes
  const unstakingRequestsQueries = useQueries({
    queries: accountIdStakingAssetIdPairs.map(
      ({ stakingAssetAccountId, stakingAssetId }) =>
        ({
          queryKey: ['getUnstakingRequests', { stakingAssetAccountId, stakingAssetId }],
          queryFn: getUnstakingRequestsQueryFn({
            stakingAssetAccountId,
            stakingAssetId,
          }),
          enabled:
            isConnected || (portfolioLoadingStatus !== 'loading' && !modal && !isLoadingLocalWallet),
        }) as const,
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
