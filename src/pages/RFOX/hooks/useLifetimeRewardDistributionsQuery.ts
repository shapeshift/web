import { isSome } from '@shapeshiftoss/utils'
import { useCallback } from 'react'
import { getAddress } from 'viem'

import type { RewardDistribution } from '../types'
import type { EpochWithIpfsHash } from './useEpochHistoryQuery'
import { useEpochHistoryQuery } from './useEpochHistoryQuery'

type UseLifetimeRewardDistributionsQueryProps = {
  stakingAssetAccountAddresses: string[]
}

export type RewardDistributionWithMetadata = RewardDistribution & {
  epoch: number
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
  const select = useCallback(
    (data: EpochWithIpfsHash[]): RewardDistributionWithMetadata[] => {
      if (!stakingAssetAccountAddresses) return []
      return data
        .sort((a, b) => b.number - a.number)
        .flatMap(epoch =>
          stakingAssetAccountAddresses.flatMap(stakingAssetAccountAddress => {
            const stakingAddress = getAddress(stakingAssetAccountAddress)

            return Object.entries(epoch.detailsByStakingContract).map(
              ([stakingContract, details]) => {
                const distribution = details.distributionsByStakingAddress[stakingAddress]

                if (!distribution) return null

                // filter out genesis "distributions"
                if (epoch.distributionStatus === 'complete' && !distribution.txId) return null

                return {
                  epoch: epoch.number,
                  stakingAddress,
                  stakingContract,
                  ipfsHash: epoch.ipfsHash,
                  ...distribution,
                }
              },
            )
          }),
        )
        .filter(isSome)
    },
    [stakingAssetAccountAddresses],
  )

  const query = useEpochHistoryQuery({ select, enabled: stakingAssetAccountAddresses.length > 0 })

  return query
}
