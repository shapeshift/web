import { RFOX_REWARD_RATE, RFOX_WAD } from 'contracts/constants'

import type { EpochMetadata } from '../types'

/**
 * Calculates the reward for an account in an epoch in RUNE base units.
 *
 * NOTE: This is a simplified version of the calculation that is only accurate enough for
 * display purposes due to precision differences between this approach and the internal
 * accounting on-chain.
 */
export const calcEpochRewardForAccountRuneBaseUnit = (
  epochEarningsForAccount: bigint,
  epochMetadata: EpochMetadata,
) => {
  const secondsInEpoch: bigint = epochMetadata.endTimestamp - epochMetadata.startTimestamp

  const totalEpochReward = (RFOX_REWARD_RATE / RFOX_WAD) * secondsInEpoch

  const epochRewardRuneBaseUnit =
    (epochEarningsForAccount / totalEpochReward) * epochMetadata.distributionAmountRuneBaseUnit

  return epochRewardRuneBaseUnit
}
