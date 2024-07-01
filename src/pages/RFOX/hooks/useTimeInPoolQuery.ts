import { skipToken, useQuery } from '@tanstack/react-query'
import { foxStakingV1Abi } from 'contracts/abis/FoxStakingV1'
import { RFOX_PROXY_CONTRACT_ADDRESS } from 'contracts/constants'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import type { GetFilterLogsReturnType } from 'viem'
import { getAbiItem, getAddress } from 'viem'
import { arbitrum } from 'viem/chains'
import { viemClientByNetworkId } from 'lib/viem-client'

const client = viemClientByNetworkId[arbitrum.id]

type UseTimeInPoolProps<SelectData = bigint> = {
  stakingAssetAccountAddress: string | undefined
  select?: (timeInPoolSeconds: bigint) => SelectData
}

export const getRfoxContractCreationBlockNumber = (contractAddress: string) => {
  switch (contractAddress) {
    case '0x1094c4a99fce60e69ffe75849309408f1262d304':
      return 222952418n
    case '0xac2a4fd70bcd8bab0662960455c363735f0e2b56':
      return 222913582n
    default:
      throw new Error(`Invalid RFOX proxy contract address`)
  }
}

export const getTimeInPoolSeconds = async (
  sortedLogs: GetFilterLogsReturnType<typeof foxStakingV1Abi, 'Stake' | 'Unstake'>,
) => {
  // If we don't have stake or unstake events, we know the user was never active in the pool
  if (!sortedLogs.length) return 0n

  let stakingBalance = 0n
  let earliestNonZeroStakingBalanceBlockNumber = undefined

  for (const log of sortedLogs) {
    switch (log.eventName) {
      case 'Stake': {
        stakingBalance += log.args.amount ?? 0n
        // Set the earliest non-zero block number if it's not already set
        if (earliestNonZeroStakingBalanceBlockNumber === undefined) {
          earliestNonZeroStakingBalanceBlockNumber = log.blockNumber
        }
        break
      }
      case 'Unstake': {
        stakingBalance -= log.args.amount ?? 0n
        // Reset the earliest non-zero block number if balance hits zero
        if (stakingBalance === 0n) {
          earliestNonZeroStakingBalanceBlockNumber = undefined
        }
        break
      }
      default:
        break
    }
  }

  // If the balance never reached zero, set the block number to the earliest staking event
  if (stakingBalance > 0n && earliestNonZeroStakingBalanceBlockNumber === undefined) {
    earliestNonZeroStakingBalanceBlockNumber = sortedLogs[0].blockNumber
  }

  // If the staking balance never got set, the user has never staked
  if (!earliestNonZeroStakingBalanceBlockNumber) return 0n

  // Get the block timestamp of the earliest non-zero staking balance
  const { timestamp: earliestNonZeroStakingBalanceTimestamp } = await client.getBlock({
    blockNumber: earliestNonZeroStakingBalanceBlockNumber,
  })

  const now = dayjs().unix()

  // Return the time the account has most recently had a non-zero staking balance to now
  return BigInt(now) - BigInt(earliestNonZeroStakingBalanceTimestamp)
}

/**
 * Calculates the time the account has most recently had a non-zero staking balance to now, in seconds
 */
const fetchTimeInPoolSeconds = async (stakingAssetAccountAddress: string): Promise<bigint> => {
  const stakeEvent = getAbiItem({ abi: foxStakingV1Abi, name: 'Stake' })
  const unstakeEvent = getAbiItem({ abi: foxStakingV1Abi, name: 'Unstake' })

  const RFOX_CONTRACT_CREATION_BLOCK_NUMBER = getRfoxContractCreationBlockNumber(
    RFOX_PROXY_CONTRACT_ADDRESS,
  )

  try {
    const [stakeLogs, unstakeLogs] = await Promise.all([
      client.getLogs({
        address: RFOX_PROXY_CONTRACT_ADDRESS,
        event: stakeEvent,
        fromBlock: RFOX_CONTRACT_CREATION_BLOCK_NUMBER,
        args: {
          account: getAddress(stakingAssetAccountAddress),
        },
      }),
      client.getLogs({
        address: RFOX_PROXY_CONTRACT_ADDRESS,
        event: unstakeEvent,
        fromBlock: RFOX_CONTRACT_CREATION_BLOCK_NUMBER,
        args: {
          account: getAddress(stakingAssetAccountAddress),
        },
      }),
    ])

    // Sort all logs by block number then log index
    const sortedLogs = [...stakeLogs, ...unstakeLogs].sort((a, b) => {
      if (a.blockNumber !== b.blockNumber) return Number(a.blockNumber - b.blockNumber)
      return Number(a.logIndex - b.logIndex)
    })

    return getTimeInPoolSeconds(sortedLogs)
  } catch (error) {
    console.error(error)
    throw error
  }
}

export const useTimeInPoolQuery = <SelectData = bigint>({
  stakingAssetAccountAddress,
  select,
}: UseTimeInPoolProps<SelectData>) => {
  const queryKey = useMemo(
    () => ['timeInPool', stakingAssetAccountAddress],
    [stakingAssetAccountAddress],
  )
  const queryFn = useMemo(
    () =>
      stakingAssetAccountAddress
        ? () => fetchTimeInPoolSeconds(stakingAssetAccountAddress)
        : skipToken,
    [stakingAssetAccountAddress],
  )

  const timeInPoolQuery = useQuery({
    queryKey,
    queryFn,
    select,
  })

  return timeInPoolQuery
}
