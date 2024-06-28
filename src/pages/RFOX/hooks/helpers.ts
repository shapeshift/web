import { RFOX_REWARD_RATE, RFOX_WAD } from 'contracts/constants'

import type { PartialEpochMetadata } from '../types'

/**
 * Calculates the reward for an account in an epoch in RUNE base units.
 *
 * NOTE: This is a simplified version of the calculation that is only accurate enough for
 * display purposes due to precision differences between this approach and the internal
 * accounting on-chain.
 */
export const calcEpochRewardForAccountRuneBaseUnit = (
  epochEarningsForAccount: bigint,
  epochMetadata: PartialEpochMetadata,
) => {
  const secondsInEpoch: bigint = epochMetadata.endTimestamp - epochMetadata.startTimestamp + 1n

  const totalEpochReward = (RFOX_REWARD_RATE / RFOX_WAD) * secondsInEpoch
  const epochEarningsForAccountAdjustedForWAD = epochEarningsForAccount / RFOX_WAD
  const epochRewardRuneBaseUnit =
    (epochEarningsForAccountAdjustedForWAD / totalEpochReward) *
    epochMetadata.distributionAmountRuneBaseUnit

  return epochRewardRuneBaseUnit
}
