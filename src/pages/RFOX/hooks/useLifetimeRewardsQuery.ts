import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import { getAddress } from 'viem'

import { getStakingContract } from '../helpers'
import type { Epoch } from '../types'
import { useEpochHistoryQuery } from './useEpochHistoryQuery'

type UseLifetimeRewardsQueryProps = {
  stakingAssetId: AssetId
  stakingAssetAccountId: AccountId | undefined
}

/**
 * Gets the lifetime rewards for a given account address, excluding the current epoch.
 */
export const useLifetimeRewardsQuery = ({
  stakingAssetId,
  stakingAssetAccountId,
}: UseLifetimeRewardsQueryProps) => {
  const select = useCallback(
    (data: Epoch[]): bigint => {
      if (!stakingAssetAccountId) return 0n

      return data.reduce((acc, epoch) => {
        const distribution =
          epoch.detailsByStakingContract[getStakingContract(stakingAssetId)]
            ?.distributionsByStakingAddress[getAddress(stakingAssetAccountId)]

        if (!distribution) return acc

        // filter out genesis "distributions"
        if (epoch.distributionStatus === 'complete' && !distribution.txId) return acc

        return acc + BigInt(distribution.amount)
      }, 0n)
    },
    [stakingAssetId, stakingAssetAccountId],
  )

  const query = useEpochHistoryQuery({
    select,
    enabled: !!stakingAssetAccountId,
  })

  return query
}
