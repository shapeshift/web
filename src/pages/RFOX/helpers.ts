import { parseAbiStakingInfo } from './hooks/helpers'
import type { AbiStakingInfo, StakingInfo } from './types'

export const selectFromStakingInfo = (
  key: keyof StakingInfo,
  abiStakingInfo: AbiStakingInfo | null,
) => {
  if (!abiStakingInfo) {
    return undefined
  }

  return parseAbiStakingInfo(abiStakingInfo)[key]?.toString()
}

export const selectRuneAddress = (abiStakingInfo: AbiStakingInfo | null) => {
  return selectFromStakingInfo('runeAddress', abiStakingInfo)
}

export const selectStakingBalance = (abiStakingInfo: AbiStakingInfo | null) => {
  return selectFromStakingInfo('stakingBalance', abiStakingInfo)
}
