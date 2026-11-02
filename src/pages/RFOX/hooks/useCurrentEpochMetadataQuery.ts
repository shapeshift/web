import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useEffect, useState } from 'react'

import { CURRENT_EPOCH_IPFS_HASH, IPFS_GATEWAY } from '../constants'
import type { CurrentEpochMetadata } from '../types'
import { isCurrentEpoch } from './epochStatus'

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
  const [now, setNow] = useState(Date.now)
  const currentEpochMetadataQuery = useQuery({
    queryKey: getCurrentEpochMetadataQueryKey(),
    queryFn: fetchCurrentEpochMetadata,
  })

  const metadata = currentEpochMetadataQuery.data

  useEffect(() => {
    if (!metadata) return
    const boundary =
      now < metadata.epochStartTimestamp
        ? metadata.epochStartTimestamp
        : metadata.epochEndTimestamp + 1
    if (!Number.isFinite(boundary) || boundary <= now) return

    const timeout = setTimeout(
      () => setNow(Date.now()),
      Math.max(0, Math.min(boundary - Date.now(), 2_147_483_647)),
    )
    return () => clearTimeout(timeout)
  }, [metadata, now])

  const isOutdated = Boolean(metadata && !isCurrentEpoch(metadata, now))

  return {
    ...currentEpochMetadataQuery,
    data: isOutdated ? undefined : metadata,
    isOutdated,
  }
}
