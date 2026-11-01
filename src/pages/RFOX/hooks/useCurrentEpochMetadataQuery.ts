import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

import { CURRENT_EPOCH_IPFS_HASH, IPFS_GATEWAY } from '../constants'
import type { CurrentEpochMetadata } from '../types'

type CurrentEpochMetadataQueryKey = ['currentEpochMetadata']

export const getCurrentEpochMetadataQueryKey = (): CurrentEpochMetadataQueryKey => [
  'currentEpochMetadata',
]

export const fetchCurrentEpochMetadata = async (): Promise<CurrentEpochMetadata> => {
  const { data: currentEpochMetadata } = await axios.get<CurrentEpochMetadata>(
    `${IPFS_GATEWAY}/${CURRENT_EPOCH_IPFS_HASH}`,
    { timeout: 15_000 },
  )

  return currentEpochMetadata
}

export const useCurrentEpochMetadataQuery = () => {
  const currentEpochMetadataQuery = useQuery({
    queryKey: getCurrentEpochMetadataQueryKey(),
    queryFn: fetchCurrentEpochMetadata,
  })

  return currentEpochMetadataQuery
}
