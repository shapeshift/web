import { parseAbiStakingInfo } from './hooks/helpers'
import type { EpochWithIpfsHash } from './hooks/useEpochHistoryQuery'
import type { AbiStakingInfo, StakingInfo } from './types'

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
  const lastEpoch = data[data.length - 1]

  return lastEpoch
}
