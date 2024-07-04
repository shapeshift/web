import { RFOX_REWARD_RATE, RFOX_WAD } from 'contracts/constants'
import { bn } from 'lib/bignumber/bignumber'

import type { AbiStakingInfo, PartialEpochMetadata, StakingInfo } from '../types'

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

export const getRfoxContractCreationBlockNumber = (contractAddress: string) => {
  switch (contractAddress) {
    case '0x1094c4a99fce60e69ffe75849309408f1262d304':
      return 222952418n
    case '0xac2a4fd70bcd8bab0662960455c363735f0e2b56':
      return 222913582n
    default:
      throw new Error(`Invalid RFOX proxy contract address`)
  }
}

export const parseAbiStakingInfo = (abiStakingInfo: AbiStakingInfo): StakingInfo => {
  const [stakingBalance, unstakingBalance, earnedRewards, rewardPerTokenStored, runeAddress] =
    abiStakingInfo
  return {
    stakingBalance,
    unstakingBalance,
    earnedRewards,
    rewardPerTokenStored,
    runeAddress,
  }
}
