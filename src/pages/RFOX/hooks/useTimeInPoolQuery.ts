import { viemClientByNetworkId } from '@shapeshiftoss/contracts'
import { skipToken, useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import { arbitrum } from 'viem/chains'
import { queryClient } from 'context/QueryClientProvider/queryClient'

import type { RFOXAccountLog } from '../types'
import { getAccountLogsQueryFn, getAccountLogsQueryKey } from './useAccountLogsQuery'

const client = viemClientByNetworkId[arbitrum.id]

type UseTimeInPoolQueryProps<SelectData = bigint> = {
  stakingAssetAccountAddress: string | undefined
  select?: (timeInPoolSeconds: bigint) => SelectData
}

export const getTimeInPoolSeconds = async (sortedLogs: RFOXAccountLog[]) => {
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
        continue
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

export const useTimeInPoolQuery = <SelectData = bigint>({
  stakingAssetAccountAddress,
  select,
}: UseTimeInPoolQueryProps<SelectData>) => {
  const queryKey = useMemo(
    () => ['timeInPool', stakingAssetAccountAddress],
    [stakingAssetAccountAddress],
  )
  const queryFn = useMemo(
    () =>
      stakingAssetAccountAddress
        ? async () => {
            const sortedAccountLogs = await queryClient.fetchQuery({
              queryFn: getAccountLogsQueryFn(stakingAssetAccountAddress),
              queryKey: getAccountLogsQueryKey(stakingAssetAccountAddress),
            })

            return getTimeInPoolSeconds(sortedAccountLogs)
          }
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
