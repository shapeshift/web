import type { RFOX_ABI } from '@shapeshiftoss/contracts'
import type { Address, Log, ReadContractReturnType } from 'viem'
import type { PartialFields } from 'lib/types'

import type { setRuneAddressEvent, stakeEvent, unstakeEvent, withdrawEvent } from './constants'

export type AddressSelectionValues = {
  manualRuneAddress: string | undefined
}

export type CurrentEpochMetadata = {
  /** The current epoch number */
  epoch: number
  /** The start timestamp for the current epoch */
  epochStartTimestamp: number
  /** The end timestamp for the current epoch */
  epochEndTimestamp: number
  /** The current percentage of revenue (RUNE) earned by the treasury to be distributed as rewards */
  distributionRate: number
  /** The current percentage of revenue (RUNE) earned by the treasury to be used to buy FOX from the open market and subsequently burned */
  burnRate: number
  /** The treasury address on THORChain used to determine revenue earned by the DAO for RFOX reward distributions and total burn */
  treasuryAddress: string
  /** A record of historical epoch number to their corresponding IPFS hashes */
  ipfsHashByEpoch: Record<number, string>
}

export type RewardDistribution = {
  /** The amount (RUNE) distributed to the reward address */
  amount: string
  /** The rFOX staking reward units earned for the current epoch */
  rewardUnits: string
  /** The total rFOX staking reward units earned across all epochs */
  totalRewardUnits: string
  /** The transaction ID (THORChain) for the reward distribution, empty string if not yet distributed */
  txId: string
  /** The address used for the reward distribution */
  rewardAddress: string
}

export type Epoch = {
  /** The epoch number for this epoch */
  number: number
  /** The start timestamp for this epoch */
  startTimestamp: number
  /** The end timestamp for this epoch */
  endTimestamp: number
  /** The start block for this epoch */
  startBlock: number
  /** The end block for this epoch */
  endBlock: number
  /** The total revenue (RUNE) earned by the treasury for this epoch */
  totalRevenue: string
  /** The total RFOX staking reward units for this epoch */
  totalRewardUnits: string
  /** The percentage of revenue (RUNE) accumulated by the treasury to be distributed as rewards for this epoch */
  distributionRate: number
  /** The percentage of revenue (RUNE) accumulated by the treasury to be used to buy FOX from the open market and subsequently burned for this epoch */
  burnRate: number
  /** The treasury address on THORChain used to determine revenue earned by the DAO for rFOX reward distributions and total burn */
  treasuryAddress: string
  /** The status of the reward distribution */
  distributionStatus: 'pending' | 'complete'
  /** A record of staking address to reward distribution for this epoch */
  distributionsByStakingAddress: Record<string, RewardDistribution>
}

export type PartialEpoch = PartialFields<Epoch, 'endBlock'>

export type RFOXAccountLog =
  | Log<bigint, number, false, typeof setRuneAddressEvent, false>
  | Log<bigint, number, false, typeof stakeEvent, false>
  | Log<bigint, number, false, typeof unstakeEvent, false>
  | Log<bigint, number, false, typeof withdrawEvent, false>

export type AbiStakingInfo = ReadContractReturnType<
  typeof RFOX_ABI,
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
