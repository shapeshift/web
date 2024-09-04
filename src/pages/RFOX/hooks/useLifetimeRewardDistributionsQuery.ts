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
        .filter(epoch => epoch.number >= 0)
        .sort((a, b) => b.number - a.number)
        .flatMap(epoch =>
          stakingAssetAccountAddresses.map(stakingAssetAccountAddress => {
            const stakingAddress = getAddress(stakingAssetAccountAddress)
            const distribution = epoch.distributionsByStakingAddress[stakingAddress]

            if (!distribution) return null

            return {
              epoch: epoch.number,
              stakingAddress,
              ipfsHash: epoch.ipfsHash,
              ...distribution,
            }
          }),
        )
        .filter(isSome)
    },
    [stakingAssetAccountAddresses],
  )

  const query = useEpochHistoryQuery({ select, enabled: stakingAssetAccountAddresses.length > 0 })

  return query
}
