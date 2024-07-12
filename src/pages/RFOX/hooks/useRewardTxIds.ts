import { isSome } from '@shapeshiftoss/utils'
import { useCallback } from 'react'
import { getAddress } from 'viem'

import type { Epoch } from '../types'
import { useEpochHistoryQuery } from './useEpochHistoryQuery'

type UseLifetimeRewardsQueryProps = {
  stakingAssetAccountAddresses: string[]
}

/**
 * Gets the lifetime reward transaction IDs for a given account address.
 * Supports multiple staking asset account addresses.
 */
export const useRewardTxIds = ({ stakingAssetAccountAddresses }: UseLifetimeRewardsQueryProps) => {
  const select = useCallback(
    (data: Epoch[]): string[] => {
      if (!stakingAssetAccountAddresses) return []
      return data
        .flatMap(epoch =>
          stakingAssetAccountAddresses.map(stakingAssetAccountAddress => {
            const checksummedStakingAssetAccountAddress = getAddress(stakingAssetAccountAddress)
            return epoch.distributionsByStakingAddress[checksummedStakingAssetAccountAddress]?.txId
          }),
        )
        .filter(isSome)
    },
    [stakingAssetAccountAddresses],
  )

  const query = useEpochHistoryQuery({ select, enabled: stakingAssetAccountAddresses.length > 0 })

  return query
}
