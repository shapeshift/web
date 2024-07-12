import { RFOX_WAD } from 'contracts/constants'
import { bn } from 'lib/bignumber/bignumber'

import type { AbiStakingInfo, PartialEpoch, StakingInfo } from '../types'

/**
 * Calculates the reward for an account in an epoch in RUNE base units.
 *
 * NOTE: This is a simplified version of the calculation that is only accurate enough for
 * display purposes due to precision differences between this approach and the internal
 * accounting on-chain.
 */
export const calcEpochRewardForAccountRuneBaseUnit = (
  epochRewardUnitsForAccount: bigint,
  epoch: PartialEpoch,
) => {
  const epochEarningsForAccountAdjustedForWAD = epochRewardUnitsForAccount / RFOX_WAD
  const distributionAmountRuneBaseUnit = scaleDistributionAmount(epoch)
  const epochRewardRuneBaseUnit = bn(epochEarningsForAccountAdjustedForWAD.toString())
    .div(epoch.totalRewardUnits.toString())
    .times(distributionAmountRuneBaseUnit.toString())
    .toFixed(0)

  console.log({
    epoch,
    epochEarningsForAccountAdjustedForWAD,
    distributionAmountRuneBaseUnit: distributionAmountRuneBaseUnit.toString(),
    totalRewardUnits: epoch.totalRewardUnits,
    epochRewardRuneBaseUnit,
  })

  return BigInt(epochRewardRuneBaseUnit)
}

export const scaleDistributionAmount = (epoch: PartialEpoch) => {
  const affiliateRevenueRuneBaseUnit = bn(epoch.totalRevenue)
  return affiliateRevenueRuneBaseUnit.times(epoch.distributionRate)
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
