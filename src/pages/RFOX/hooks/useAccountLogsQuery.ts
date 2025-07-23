import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { viemClientByNetworkId } from '@shapeshiftoss/contracts'
import { skipToken } from '@tanstack/react-query'
import { getAddress } from 'viem'
import { arbitrum } from 'viem/chains'

import { stakeEvent, unstakeEvent } from '../constants'
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
  const creationBlockNumber = getRfoxContractCreationBlockNumber(getStakingContract(stakingAssetId))

  try {
    const latestBlockNumber = await client.getBlockNumber()
    const numChunks = 10
    const totalBlocks = Number(latestBlockNumber) - Number(creationBlockNumber) + 1

    const blockChunks: { from: bigint; to?: bigint }[] = []
    for (let i = 0; i < numChunks; i++) {
      const isLastChunk = i === numChunks - 1
      const from = Number(creationBlockNumber) + Math.floor((totalBlocks * i) / numChunks)
      const to = Number(creationBlockNumber) + Math.floor((totalBlocks * (i + 1)) / numChunks) - 1
      blockChunks.push({ from: BigInt(from), ...(isLastChunk ? {} : { to: BigInt(to) }) })
    }

    const logsByEventType: RFOXAccountLog[][] = []
    for (const event of [stakeEvent, unstakeEvent]) {
      const chunkedLogs = await Promise.all(
        blockChunks.map(
          chunk =>
            client.getLogs({
              address: getStakingContract(stakingAssetId),
              event,
              fromBlock: chunk.from,
              toBlock: chunk.to,
              args: {
                account: getAddress(fromAccountId(stakingAssetAccountId).account),
              },
            }) as Promise<RFOXAccountLog[]>,
        ),
      )

      logsByEventType.push(chunkedLogs.flat())
    }

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
