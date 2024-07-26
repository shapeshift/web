import { isSome } from '@shapeshiftoss/utils'
import { useCallback } from 'react'
import { getAddress } from 'viem'

import type { Epoch, RewardDistribution } from '../types'
import { useEpochHistoryQuery } from './useEpochHistoryQuery'

type UseLifetimeRewardDistributionsQueryProps = {
  stakingAssetAccountAddresses: string[]
}

/**
 * Gets the lifetime reward distributions for a given account address.
 * Supports multiple staking asset account addresses.
 */
export const useLifetimeRewardDistributionsQuery = ({
  stakingAssetAccountAddresses,
}: UseLifetimeRewardDistributionsQueryProps) => {
  const select = useCallback(
    (data: Epoch[]): RewardDistribution[] => {
      if (!stakingAssetAccountAddresses) return []
      return data
        .filter(epoch => epoch.number >= 0)
        .flatMap(epoch =>
          stakingAssetAccountAddresses.map(stakingAssetAccountAddress => {
            const checksumStakingAssetAccountAddress = getAddress(stakingAssetAccountAddress)
            return epoch.distributionsByStakingAddress[checksumStakingAssetAccountAddress]
          }),
        )
        .filter(isSome)
    },
    [stakingAssetAccountAddresses],
  )

  const query = useEpochHistoryQuery({ select, enabled: stakingAssetAccountAddresses.length > 0 })

  return query
}
