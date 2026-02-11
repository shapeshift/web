import type { RFOX_ABI } from '@shapeshiftoss/contracts'
import type { Address, Log, ReadContractReturnType } from 'viem'

import type { stakeEvent, unstakeEvent } from './constants'

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
  /** The treasury address on THORChain used to determine revenue earned by the DAO for rFOX reward distributions and total burn */
  treasuryAddress: string
  /** The current percentage of revenue (RUNE) earned by the treasury to be used to buy FOX from the open market and subsequently burned */
  burnRate: number
  /** The current percentage of revenue (RUNE) earned by the treasury to be distributed as rewards for each staking contract */
  distributionRateByStakingContract: Record<string, number>
  /** The IPFS hashes for each epoch */
  ipfsHashByEpoch: Record<string, string>
}

export type RewardDistribution = {
  /** The amount (reward asset) distributed to the reward address */
  amount: string
  /** The rFOX staking reward units earned for the current epoch */
  rewardUnits: string
  /** The total rFOX staking reward units earned across all epochs */
  totalRewardUnits: string
  /** The transaction ID for the reward distribution */
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
  /** The timestamp of the pending or complete reward distribution */
  distributionTimestamp: number
  /** The start block for this epoch */
  startBlock: number
  /** The end block for this epoch */
  endBlock: number
  /** The total revenue (USD) earned this epoch */
  totalRevenue: string
  /** The revenue (USD) earned (by service) for this epoch */
  revenue: Record<string, string>
  /** The percentage of revenue to be used to buy FOX from the open market and subsequently burned for this epoch */
  burnRate: number
  /** The spot price of reward asset in USD */
  rewardAssetPriceUsd: string
  /** The status of the reward distribution */
  distributionStatus: 'pending' | 'complete'
  /** The details for each staking contract for this epoch */
  detailsByStakingContract: Record<string, EpochDetails>
}

export type EpochDetails = {
  /** The total rFOX staking reward units for this epoch */
  totalRewardUnits: string
  /** The percentage of revenue to be distributed as rewards for this epoch */
  distributionRate: number
  /** The spot price of asset in USD */
  assetPriceUsd: string
  /** The reward distribution for each staking address for this epoch */
  distributionsByStakingAddress: Record<string, RewardDistribution>
}

export type RFOXAccountLog =
  | Log<bigint, number, false, typeof stakeEvent, false>
  | Log<bigint, number, false, typeof unstakeEvent, false>

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
