import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

import { CURRENT_EPOCH_IPFS_HASH, IPFS_GATEWAY } from '../constants'
import type { CurrentEpochMetadata } from '../types'

type CurrentEpochMetadataQueryKey = ['currentEpochMetadata', string]

export const getCurrentEpochMetadataQueryKey = (): CurrentEpochMetadataQueryKey => [
  'currentEpochMetadata',
  CURRENT_EPOCH_IPFS_HASH,
]

export const fetchCurrentEpochMetadata = async (): Promise<CurrentEpochMetadata> => {
  const { data: currentEpochMetadata } = await axios.get<CurrentEpochMetadata>(
    `${IPFS_GATEWAY}/${CURRENT_EPOCH_IPFS_HASH}`,
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
