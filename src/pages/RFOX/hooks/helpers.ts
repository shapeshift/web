import { RFOX_REWARD_RATE, RFOX_WAD } from 'contracts/constants'
import { bn } from 'lib/bignumber/bignumber'

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
  const epochRewardRuneBaseUnit = bn(epochEarningsForAccountAdjustedForWAD.toString())
    .div(totalEpochReward.toString())
    .times(epochMetadata.distributionAmountRuneBaseUnit.toString())
    .toFixed(0)

  return BigInt(epochRewardRuneBaseUnit)
}

export const scaleDistributionAmount = (affiliateRevenueRuneBaseUnit: bigint) => {
  // We distribute 25% of the affiliate revenue to the stakers, so divide by 4
  // https://snapshot.org/#/shapeshiftdao.eth/proposal/0x0bb84bdf838fb90da922ce62293336bf7c0c67a9a1d6fe451ffaa29284722f9f
  return affiliateRevenueRuneBaseUnit / 4n
}
