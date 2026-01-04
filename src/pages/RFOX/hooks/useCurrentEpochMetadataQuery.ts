import { useQuery } from '@tanstack/react-query'

import type { CurrentEpochMetadata } from '../types'

import type { GraphQLRfoxCurrentEpochMetadata } from '@/lib/graphql'
import { fetchRfoxCurrentEpochMetadataGraphQL } from '@/lib/graphql'

type CurrentEpochMetadataQueryKey = ['currentEpochMetadata']

export const getCurrentEpochMetadataQueryKey = (): CurrentEpochMetadataQueryKey => [
  'currentEpochMetadata',
]

const mapGraphQLMetadataToMetadata = (
  metadata: GraphQLRfoxCurrentEpochMetadata,
): CurrentEpochMetadata => ({
  epoch: metadata.epoch,
  epochStartTimestamp: metadata.epochStartTimestamp,
  epochEndTimestamp: metadata.epochEndTimestamp,
  treasuryAddress: metadata.treasuryAddress,
  burnRate: metadata.burnRate,
  distributionRateByStakingContract: metadata.distributionRateByStakingContract as Record<
    string,
    number
  >,
  ipfsHashByEpoch: metadata.ipfsHashByEpoch as Record<string, string>,
})

export const fetchCurrentEpochMetadata = async (): Promise<CurrentEpochMetadata> => {
  const metadata = await fetchRfoxCurrentEpochMetadataGraphQL()
  if (!metadata) {
    throw new Error('Failed to fetch current epoch metadata')
  }
  return mapGraphQLMetadataToMetadata(metadata)
}

export const useCurrentEpochMetadataQuery = () => {
  const currentEpochMetadataQuery = useQuery({
    queryKey: getCurrentEpochMetadataQueryKey(),
    queryFn: fetchCurrentEpochMetadata,
  })

  return currentEpochMetadataQuery
}
