import type { AssetId } from '@shapeshiftoss/caip'
import { foxOnArbitrumOneAssetId, uniV2EthFoxArbitrumAssetId } from '@shapeshiftoss/caip'
import { RFOX_LP_PROXY_CONTRACT, RFOX_PROXY_CONTRACT } from '@shapeshiftoss/contracts'
import { invert } from 'lodash'

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

const stakingContractByAssetId = {
  [foxOnArbitrumOneAssetId]: RFOX_PROXY_CONTRACT,
  [uniV2EthFoxArbitrumAssetId]: RFOX_LP_PROXY_CONTRACT,
}

const stakingAssetIdByContract = invert(stakingContractByAssetId)

export const getStakingContract = (stakingAssetId: AssetId) => {
  const stakingContract = stakingContractByAssetId[stakingAssetId]
  if (!stakingContract) throw new Error(`No rFOX staking contract for ${stakingAssetId}`)
  return stakingContract
}

export const getStakingAssetId = (stakingContract: string) => {
  const stakingAssetId = stakingAssetIdByContract[stakingContract]
  if (!stakingAssetId) throw new Error(`No rFOX staking assetId for ${stakingContract}`)
  return stakingAssetId
}
