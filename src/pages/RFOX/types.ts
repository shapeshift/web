import type { foxStakingV1Abi } from 'contracts/abis/FoxStakingV1'
import type { Address, Log, ReadContractReturnType } from 'viem'
import type { PartialFields } from 'lib/types'

import type { setRuneAddressEvent, stakeEvent, unstakeEvent, withdrawEvent } from './constants'

export type AddressSelectionValues = {
  manualRuneAddress: string | undefined
}

export type EpochMetadata = {
  startBlockNumber: bigint
  endBlockNumber: bigint
  startTimestamp: bigint
  endTimestamp: bigint
  distributionAmountRuneBaseUnit: bigint
}

export type PartialEpochMetadata = PartialFields<EpochMetadata, 'endBlockNumber'>

export type RFOXAccountLog =
  | Log<bigint, number, false, typeof setRuneAddressEvent, false>
  | Log<bigint, number, false, typeof stakeEvent, false>
  | Log<bigint, number, false, typeof unstakeEvent, false>
  | Log<bigint, number, false, typeof withdrawEvent, false>

export type AbiStakingInfo = ReadContractReturnType<
  typeof foxStakingV1Abi,
  'stakingInfo',
  readonly [Address]
>

export type StakingInfo = {
  stakingBalance: bigint
  unstakingBalance: bigint
  earnedRewards: bigint
  rewardPerTokenStored: bigint
  runeAddress: string
}
