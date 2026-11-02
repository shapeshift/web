import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

import type { CurrentEpochMetadata } from '../types'

import { getConfig } from '@/config'

type CurrentEpochMetadataQueryKey = ['currentEpochMetadata']

const getCurrentEpochMetadataQueryKey = (): CurrentEpochMetadataQueryKey => ['currentEpochMetadata']

const fetchCurrentEpochMetadata = async (): Promise<CurrentEpochMetadata> => {
  const { data: currentEpochMetadata } = await axios.get<CurrentEpochMetadata>(
    `${getConfig().VITE_PROXY_API_BASE_URL}/api/v1/rfox/metadata`,
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
