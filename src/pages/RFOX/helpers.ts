import type { AssetId } from '@shapeshiftoss/caip'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import { viemClientByNetworkId } from '@shapeshiftoss/contracts'
import { mapValues } from 'lodash'

import type { RfoxStakingConfig } from './constants'
import { RFOX_STAKING_CONFIG, RFOX_V3_UPGRADE_EPOCH } from './constants'
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

export const selectStakingBalance = (abiStakingInfo: AbiStakingInfo) => {
  return selectFromStakingInfo('stakingBalance', abiStakingInfo)
}

export const selectLatestEpoch = (data: EpochWithIpfsHash[]): EpochWithIpfsHash | undefined => {
  return data[0]
}

const stakingAssetIdByContract = Object.entries(
  mapValues(RFOX_STAKING_CONFIG, config => config.stakingContract),
).reduce<Record<string, AssetId>>((acc, [stakingAssetId, stakingContract]) => {
  acc[stakingContract] = stakingAssetId
  return acc
}, {})

export const getRfoxStakingConfig = (stakingAssetId: AssetId): RfoxStakingConfig => {
  const config = RFOX_STAKING_CONFIG[stakingAssetId]
  if (!config) throw new Error(`No rFOX staking config for ${stakingAssetId}`)
  return config
}

export const getStakingContract = (stakingAssetId: AssetId) =>
  getRfoxStakingConfig(stakingAssetId).stakingContract

export const maybeGetStakingAssetId = (stakingContract: string): AssetId | undefined =>
  stakingAssetIdByContract[stakingContract]

export const getStakingAssetId = (stakingContract: string) => {
  const stakingAssetId = maybeGetStakingAssetId(stakingContract)
  if (!stakingAssetId) throw new Error(`No rFOX staking assetId for ${stakingContract}`)
  return stakingAssetId
}

export const getRfoxChainId = (stakingAssetId: AssetId) =>
  getRfoxStakingConfig(stakingAssetId).chainId

export const getRfoxNetworkId = (stakingAssetId: AssetId) =>
  getRfoxStakingConfig(stakingAssetId).networkId

export const getRfoxClient = (stakingAssetId: AssetId) =>
  viemClientByNetworkId[getRfoxStakingConfig(stakingAssetId).networkId]

// rFOX v3 moved rewards from rune to a stable, paid on the staking contract's own chain - so the
// reward asset varies by epoch as well as by program
export const getRewardAssetId = (stakingAssetId: AssetId, epochNumber: number): AssetId => {
  if (epochNumber < RFOX_V3_UPGRADE_EPOCH) return thorchainAssetId
  return getRfoxStakingConfig(stakingAssetId).rewardAssetId
}
