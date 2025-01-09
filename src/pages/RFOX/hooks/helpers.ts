import { foxOnArbitrumOneAssetId } from '@shapeshiftoss/caip'
import {
  RFOX_LP_PROXY_CONTRACT,
  RFOX_PROXY_CONTRACT,
  RFOX_REWARD_RATE,
} from '@shapeshiftoss/contracts'
import { bn } from 'lib/bignumber/bignumber'

import { getStakingContract } from '../helpers'
import type { CurrentEpochMetadata } from '../types'

/**
 * Calculates the reward for an account in an epoch in RUNE base units.
 *
 * NOTE: This is a simplified version of the calculation that is only accurate enough for
 * display purposes due to precision differences between this approach and the internal
 * accounting on-chain.
 */
export const calcEpochRewardForAccountRuneBaseUnit = (
  rewardUnits: bigint,
  affiliateRevenue: bigint,
  currentEpochMetadata: CurrentEpochMetadata,
) => {
  // Calculate the total reward units for the current epoch thus far
  const secondsInCurrentEpoch = (Date.now() - currentEpochMetadata.epochStartTimestamp) / 1000
  const totalRewardUnits = RFOX_REWARD_RATE * BigInt(Math.floor(secondsInCurrentEpoch))
  const distributionRate =
    currentEpochMetadata.distributionRateByStakingContract[
      getStakingContract(foxOnArbitrumOneAssetId)
    ]

  const distributionAmountRuneBaseUnit = bn(affiliateRevenue.toString())
    .times(distributionRate)
    .toFixed(0)

  const epochRewardRuneBaseUnit = bn(rewardUnits.toString())
    .div(totalRewardUnits.toString())
    .times(distributionAmountRuneBaseUnit.toString())
    .toFixed(0)

  return BigInt(epochRewardRuneBaseUnit)
}

export const getRfoxContractCreationBlockNumber = (contractAddress: string) => {
  switch (contractAddress) {
    case RFOX_PROXY_CONTRACT:
      return 222913582n
    case RFOX_LP_PROXY_CONTRACT:
      return 291163572n
    default:
      throw new Error(`Invalid RFOX proxy contract address`)
  }
}
