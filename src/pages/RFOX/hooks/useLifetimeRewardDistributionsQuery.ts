import { bnOrZero, isSome } from '@shapeshiftoss/utils'
import type { UseQueryResult } from '@tanstack/react-query'
import { useQueries } from '@tanstack/react-query'
import { useCallback } from 'react'
import { getAddress } from 'viem'

import type { Epoch, RewardDistribution } from '../types'
import { useCurrentEpochMetadataQuery } from './useCurrentEpochMetadataQuery'
import type { EpochWithIpfsHash } from './useEpochHistoryQuery'
import { getEpochHistoryQueryOptions } from './useEpochHistoryQuery'

import { mergeQueryOutputs } from '@/react-queries/helpers'

type UseLifetimeRewardDistributionsQueryProps = {
  stakingAssetAccountAddresses: string[]
}

export type RewardDistributionWithMetadata = RewardDistribution & {
  epoch: number
  distributionTimestamp: number
  status: Epoch['distributionStatus']
  stakingAddress: string
  stakingContract: string
  ipfsHash: string
}

/**
 * Gets the lifetime reward distributions for a given account address.
 * Supports multiple staking asset account addresses.
 */
export const useLifetimeRewardDistributionsQuery = ({
  stakingAssetAccountAddresses,
}: UseLifetimeRewardDistributionsQueryProps) => {
  const { data: metadata } = useCurrentEpochMetadataQuery()

  const combine = useCallback(
    (queries: UseQueryResult<EpochWithIpfsHash[], Error>[]) =>
      mergeQueryOutputs(queries, results =>
        results.flatMap((epochs, index) => {
          const stakingAddress = getAddress(stakingAssetAccountAddresses[index])

          return (epochs ?? []).flatMap(epoch =>
            Object.entries(epoch.detailsByStakingContract)
              .map<RewardDistributionWithMetadata | null>(([stakingContract, details]) => {
                const distribution = details.distributionsByStakingAddress[stakingAddress]

                if (!distribution) return null

                // filter out genesis "distributions"
                if (bnOrZero(distribution.amount).eq(0)) return null
                if (epoch.distributionStatus === 'complete' && !distribution.txId) return null

                return {
                  epoch: epoch.number,
                  distributionTimestamp: epoch.distributionTimestamp,
                  status: epoch.distributionStatus,
                  stakingAddress,
                  stakingContract,
                  ipfsHash: epoch.ipfsHash,
                  ...distribution,
                }
              })
              .filter(isSome),
          )
        }),
      ),
    [stakingAssetAccountAddresses],
  )

  return useQueries({
    queries: stakingAssetAccountAddresses.map(stakingAddress =>
      getEpochHistoryQueryOptions({ stakingAddress, epoch: metadata?.epoch }),
    ),
    combine,
  })
}
