import type { AssetId } from '@shapeshiftoss/caip'
import { foxEthLpArbitrumAssetId, foxOnArbitrumOneAssetId } from '@shapeshiftoss/caip'
import { RFOX_LP_PROXY_CONTRACT, RFOX_PROXY_CONTRACT } from '@shapeshiftoss/contracts'

import type { EpochWithIpfsHash } from './hooks/useEpochHistoryQuery'
import type { AbiStakingInfo, StakingInfo } from './types'

const parseAbiStakingInfo = (abiStakingInfo: AbiStakingInfo): StakingInfo => {
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

export const selectFromStakingInfo = (key: keyof StakingInfo, abiStakingInfo: AbiStakingInfo) => {
  return parseAbiStakingInfo(abiStakingInfo)[key]?.toString()
}

export const selectRuneAddress = (abiStakingInfo: AbiStakingInfo) => {
  return selectFromStakingInfo('runeAddress', abiStakingInfo)
}

export const selectStakingBalance = (abiStakingInfo: AbiStakingInfo) => {
  return selectFromStakingInfo('stakingBalance', abiStakingInfo)
}

export const selectLastEpoch = (data: EpochWithIpfsHash[]): EpochWithIpfsHash | undefined => {
  return data[data.length - 1]
}

export const getStakingContract = (stakingAssetId: AssetId) => {
  switch (stakingAssetId) {
    case foxOnArbitrumOneAssetId:
      return RFOX_PROXY_CONTRACT
    case foxEthLpArbitrumAssetId:
      return RFOX_LP_PROXY_CONTRACT
    default:
      throw new Error(`No rFOX staking contract for ${stakingAssetId}`)
  }
}
