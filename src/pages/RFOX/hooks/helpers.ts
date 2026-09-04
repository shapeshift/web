import type { AssetId } from '@shapeshiftoss/caip'
import { RFOX_REWARD_RATE } from '@shapeshiftoss/contracts'

import { getStakingContract } from '../helpers'
import type { CurrentEpochMetadata } from '../types'

import { bn } from '@/lib/bignumber/bignumber'

/**
 * Calculates the reward for an account in an epoch in USDC.
 *
 * NOTE: This is a simplified version of the calculation that is only accurate enough for
 * display purposes due to precision differences between this approach and the internal
 * accounting on-chain.
 */
export const calcEpochRewardForAccountUsdcBaseUnit = (
  rewardUnits: bigint,
  affiliateRevenue: string,
  currentEpochMetadata: CurrentEpochMetadata,
  stakingAssetId: AssetId,
) => {
  // Calculate the total reward units for the current epoch thus far
  const secondsInCurrentEpoch = (Date.now() - currentEpochMetadata.epochStartTimestamp) / 1000
  const totalRewardUnits = RFOX_REWARD_RATE * BigInt(Math.floor(secondsInCurrentEpoch))
  const distributionRate =
    currentEpochMetadata.distributionRateByStakingContract[getStakingContract(stakingAssetId)] ?? 0

  const distributionAmountUsdcBaseUnit = bn(affiliateRevenue).times(distributionRate).toFixed(0)
  const percentageShare = bn(rewardUnits.toString()).div(totalRewardUnits.toString())
  const epochRewardUsdcBaseUnit = percentageShare.times(distributionAmountUsdcBaseUnit).toFixed(0)

  return BigInt(epochRewardUsdcBaseUnit)
}

