import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useMemo } from 'react'

import { IPFS_GATEWAY } from '../constants'
import type { Epoch } from '../types'
import {
  fetchCurrentEpochMetadata,
  getCurrentEpochMetadataQueryKey,
} from './useCurrentEpochMetadataQuery'

import { queryClient } from '@/context/QueryClientProvider/queryClient'

type EpochHistoryQueryKey = ['epochHistory']

export type EpochWithIpfsHash = Epoch & { ipfsHash: string }

type UseEpochHistoryQueryProps<SelectData = EpochWithIpfsHash[]> = {
  enabled?: boolean
  select?: (data: EpochWithIpfsHash[]) => SelectData
}

// The query key excludes the current timestamp so we don't inadvertently end up with stupid things like reactively fetching every second etc.
// Instead we will rely on staleTime to refetch at a sensible interval.
export const getEpochHistoryQueryKey = (): EpochHistoryQueryKey => ['epochHistory']

export const fetchEpochHistory = async (): Promise<EpochWithIpfsHash[]> => {
  const currentEpochMetadata = await queryClient.fetchQuery({
    queryKey: getCurrentEpochMetadataQueryKey(),
    queryFn: fetchCurrentEpochMetadata,
  })

  const epochs = await Promise.all(
    Object.values(currentEpochMetadata.ipfsHashByEpoch).map(async hash => {
      const { data } = await axios.get<Epoch>(`${IPFS_GATEWAY}/${hash}`)
      return { ...data, ipfsHash: hash }
    }),
  )

  return epochs.sort((a, b) => b.number - a.number)
}

export const useEpochHistoryQuery = <SelectData = EpochWithIpfsHash[]>({
  enabled,
  select,
}: UseEpochHistoryQueryProps<SelectData>) => {
  // This pattern looks weird but it allows us to add parameters to the query and key later without bigger refactor
  const queryKey = useMemo(() => getEpochHistoryQueryKey(), [])

  const queryFn = useMemo(() => () => fetchEpochHistory(), [])

  return useQuery({
    queryKey,
    queryFn,
    staleTime: 60 * 60 * 1000, // 1 hour in milliseconds
    select,
    enabled,
  })
}
