import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import type { Epoch, EpochDetails } from '../types'

import type { GraphQLRfoxEpoch } from '@/lib/graphql'
import { fetchRfoxEpochHistoryGraphQL } from '@/lib/graphql'

type EpochHistoryQueryKey = ['epochHistory']

export type EpochWithIpfsHash = Epoch & { ipfsHash: string }

type UseEpochHistoryQueryProps<SelectData = EpochWithIpfsHash[]> = {
  enabled?: boolean
  select?: (data: EpochWithIpfsHash[]) => SelectData
}

export const getEpochHistoryQueryKey = (): EpochHistoryQueryKey => ['epochHistory']

const mapGraphQLEpochToEpoch = (epoch: GraphQLRfoxEpoch): EpochWithIpfsHash => ({
  number: epoch.number,
  ipfsHash: epoch.ipfsHash,
  startTimestamp: epoch.startTimestamp,
  endTimestamp: epoch.endTimestamp,
  distributionTimestamp: epoch.distributionTimestamp,
  startBlock: epoch.startBlock,
  endBlock: epoch.endBlock,
  treasuryAddress: epoch.treasuryAddress,
  totalRevenue: epoch.totalRevenue,
  burnRate: epoch.burnRate,
  runePriceUsd: epoch.runePriceUsd,
  distributionStatus: epoch.distributionStatus,
  detailsByStakingContract: epoch.detailsByStakingContract as Record<string, EpochDetails>,
})

export const fetchEpochHistory = async (): Promise<EpochWithIpfsHash[]> => {
  const epochs = await fetchRfoxEpochHistoryGraphQL()
  return epochs.map(mapGraphQLEpochToEpoch)
}

export const useEpochHistoryQuery = <SelectData = EpochWithIpfsHash[]>({
  enabled,
  select,
}: UseEpochHistoryQueryProps<SelectData>) => {
  const queryKey = useMemo(() => getEpochHistoryQueryKey(), [])

  const queryFn = useMemo(() => () => fetchEpochHistory(), [])

  return useQuery({
    queryKey,
    queryFn,
    staleTime: 60 * 60 * 1000,
    select,
    enabled,
  })
}
