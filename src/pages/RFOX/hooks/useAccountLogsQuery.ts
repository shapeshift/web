import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { viemClientByNetworkId } from '@shapeshiftoss/contracts'
import { skipToken } from '@tanstack/react-query'
import { getAddress } from 'viem'
import { arbitrum } from 'viem/chains'

import { setRuneAddressEvent, stakeEvent, unstakeEvent, withdrawEvent } from '../constants'
import { getStakingContract } from '../helpers'
import type { RFOXAccountLog } from '../types'
import { getRfoxContractCreationBlockNumber } from './helpers'

const client = viemClientByNetworkId[arbitrum.id]

/**
 * WARNING: This is a very expensive operation and should only be used behind react-query to cache the result.
 *
 * i.e DO NOT EXPORT THIS FUNCTION
 */
const fetchAccountLogs = async (
  stakingAssetAccountId: AccountId,
  stakingAssetId: AssetId,
): Promise<RFOXAccountLog[]> => {
  const rfoxCreationBlockNumber = getRfoxContractCreationBlockNumber(
    getStakingContract(stakingAssetId),
  )

  try {
    const logsByEventType = await Promise.all(
      [setRuneAddressEvent, stakeEvent, unstakeEvent, withdrawEvent].map(
        (event): Promise<RFOXAccountLog[]> =>
          client.getLogs({
            address: getStakingContract(stakingAssetId),
            event,
            fromBlock: rfoxCreationBlockNumber,
            args: {
              account: getAddress(stakingAssetAccountId),
            },
          }) as Promise<RFOXAccountLog[]>,
      ),
    )

    // Sort all logs by block number then log index
    const sortedLogs = logsByEventType.flat().sort((a, b) => {
      if (a.blockNumber !== b.blockNumber) return Number(a.blockNumber - b.blockNumber)
      return Number(a.logIndex - b.logIndex)
    })

    return sortedLogs
  } catch (error) {
    console.error(error)
    throw error
  }
}

export const getAccountLogsQueryKey = (
  stakingAssetAccountId: AccountId | undefined,
  stakingAssetId: AssetId,
) => ['accountLogs', stakingAssetAccountId, stakingAssetId]

export const getAccountLogsQueryFn = (
  stakingAssetAccountId: AccountId | undefined,
  stakingAssetId: AssetId,
) =>
  stakingAssetAccountId ? () => fetchAccountLogs(stakingAssetAccountId, stakingAssetId) : skipToken
