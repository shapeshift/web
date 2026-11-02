import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { RFOX_REWARD_RATE } from '@shapeshiftoss/contracts'
import axios from 'axios'
import { getAddress } from 'viem'

import { getRfoxContract } from '../constants'
import { getRfoxNetworkId, getStakingContract } from '../helpers'
import type { CurrentEpochMetadata } from '../types'

import { getConfig } from '@/config'

type ClosedEpochRewardStateArgs = {
  stakingAssetId: AssetId
  stakingAssetAccountId: AccountId | undefined
  metadata: CurrentEpochMetadata | undefined
}

export type ClosedEpochRewardState = {
  earned: bigint
  totalRewardUnits: bigint
}

export const getClosedEpochRewardStateQueryKey = ({
  stakingAssetId,
  stakingAssetAccountId,
  metadata,
}: ClosedEpochRewardStateArgs) =>
  [
    'closedEpochRewardState',
    { stakingAssetId, stakingAssetAccountId, epoch: metadata?.epoch },
  ] as const

const fetchClosingBlock = async (chainId: number) => {
  const { data } = await axios.get<{ blockNumber: string; timestamp: number }>(
    `${getConfig().VITE_PROXY_API_BASE_URL}/api/v1/rfox/closing-block/${chainId}`,
    { timeout: 15_000 },
  )

  return data
}

export const fetchClosedEpochRewardState = async (
  stakingAssetId: AssetId,
  stakingAssetAccountId: AccountId,
  metadata: CurrentEpochMetadata,
): Promise<ClosedEpochRewardState> => {
  const { blockNumber, timestamp } = await fetchClosingBlock(getRfoxNetworkId(stakingAssetId))

  const earned = await getRfoxContract(stakingAssetId).read.earned(
    [getAddress(fromAccountId(stakingAssetAccountId).account)],
    { blockNumber: BigInt(blockNumber) },
  )

  const secondsInEpoch = BigInt(timestamp - Math.floor(metadata.epochStartTimestamp / 1000))

  return { earned, totalRewardUnits: RFOX_REWARD_RATE * secondsInEpoch }
}

export const hasClosedEpochDistribution = (
  stakingAssetId: AssetId,
  metadata: CurrentEpochMetadata | undefined,
) => Boolean(metadata?.distributionRateByStakingContract[getStakingContract(stakingAssetId)])
