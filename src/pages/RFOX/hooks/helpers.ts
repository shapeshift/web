import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { RFOX_REWARD_RATE, RFOX_WAD } from 'contracts/constants'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import { THOR_PRECISION } from 'lib/utils/thorchain/constants'

import type { PartialEpochMetadata } from '../types'

export const calcEpochRewardForAccountRuneBaseUnit = (
  epochEarningsForAccount: bigint,
  epochMetadata: PartialEpochMetadata,
) => {
  const secondsInEpoch = epochMetadata.endTimestamp - epochMetadata.startTimestamp + 1n

  // Total raw rewards for the epoch - NOT scaled down for WAD
  const totalEpochRewards = RFOX_REWARD_RATE * secondsInEpoch

  // Scaled down to crypto precision using RFOX_WAD - we'll speak the same precision language for everything from now on
  const totalEpochRewardsCryptoPrecision = bnOrZero(totalEpochRewards.toString()).dividedBy(
    RFOX_WAD.toString(),
  )

  const epochEarningsForAccountCryptoPrecision = bnOrZero(
    epochEarningsForAccount.toString(),
  ).dividedBy(RFOX_WAD.toString())

  const userRewardsProportionCryptoPrecision = epochEarningsForAccountCryptoPrecision.dividedBy(
    totalEpochRewardsCryptoPrecision,
  )

  const distributionAmountCryptoPrecision = fromBaseUnit(
    epochMetadata.distributionAmountRuneBaseUnit.toString(),
    THOR_PRECISION,
  )

  const userRewardsCryptoPrecision = userRewardsProportionCryptoPrecision.multipliedBy(
    distributionAmountCryptoPrecision,
  )

  // We're done speaking precision everywhere, convert the epoch rewards back to THOR base unit
  const epochRewardRuneBaseUnit = toBaseUnit(userRewardsCryptoPrecision, THOR_PRECISION)

  return BigInt(epochRewardRuneBaseUnit)
}
