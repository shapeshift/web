import { useCallback } from 'react'
import { getAddress } from 'viem'

import type { Epoch } from '../types'
import { useEpochHistoryQuery } from './useEpochHistoryQuery'

type UseLifetimeRewardsQueryProps = {
  stakingAssetAccountAddress: string | undefined
}

/**
 * Gets the lifetime rewards for a given account address, excluding the current epoch.
 */
export const useLifetimeRewardsQuery = ({
  stakingAssetAccountAddress,
}: UseLifetimeRewardsQueryProps) => {
  const select = useCallback(
    (data: Epoch[]): bigint => {
      if (!stakingAssetAccountAddress) return 0n
      const checksumStakingAssetAccountAddress = getAddress(stakingAssetAccountAddress)
      return data.reduce((acc, epoch) => {
        const distribution =
          epoch.distributionsByStakingAddress[checksumStakingAssetAccountAddress]?.amount
        if (!distribution) return acc
        return acc + BigInt(distribution)
      }, 0n)
    },
    [stakingAssetAccountAddress],
  )

  const query = useEpochHistoryQuery({ select, enabled: !!stakingAssetAccountAddress })

  return query
}
