import { skipToken } from '@tanstack/react-query'
import { foxStakingV1Abi } from 'contracts/abis/FoxStakingV1'
import { RFOX_PROXY_CONTRACT_ADDRESS } from 'contracts/constants'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import { getAbiItem, getAddress } from 'viem'
import { arbitrum } from 'viem/chains'
import { useQuery } from 'wagmi/query'
import { viemClientByNetworkId } from 'lib/viem-client'

const client = viemClientByNetworkId[arbitrum.id]

type UseTimeInPoolProps = {
  stakingAssetAccountAddress: string | undefined
}

/**
 * Calculates the time the account has most recently had a non-zero staking balance to now, in seconds
 */
const getTimeInPoolSeconds = async (stakingAssetAccountAddress: string) => {
  const stakeEvent = getAbiItem({ abi: foxStakingV1Abi, name: 'Stake' })
  const unstakeEvent = getAbiItem({ abi: foxStakingV1Abi, name: 'Unstake' })

  const [stakeFilter, unstakeFilter] = await Promise.all([
    client.createEventFilter({
      address: RFOX_PROXY_CONTRACT_ADDRESS,
      event: stakeEvent,
      args: {
        account: getAddress(stakingAssetAccountAddress),
      },
    }),
    client.createEventFilter({
      address: RFOX_PROXY_CONTRACT_ADDRESS,
      event: unstakeEvent,
      args: {
        account: getAddress(stakingAssetAccountAddress),
      },
    }),
  ])

  // Fetch all stake and unstake logs. Assumes the user wont generate more than the payload limit of logs
  const [stakeLogs, unstakeLogs] = await Promise.all([
    client.getFilterLogs({ filter: stakeFilter }),
    client.getFilterLogs({ filter: unstakeFilter }),
  ])

  // Sort all logs by block number then log index
  const sortedLogs = [...stakeLogs, ...unstakeLogs].sort((a, b) => {
    if (a.blockNumber !== b.blockNumber) return Number(a.blockNumber - b.blockNumber)
    return Number(a.logIndex - b.logIndex)
  })

  let stakingBalance = 0n
  let earliestNonZeroStakingBalanceBlockNumber = undefined

  for (const log of sortedLogs) {
    switch (log.eventName) {
      case 'Stake': {
        stakingBalance += log.args.amount ?? 0n
        break
      }
      case 'Unstake': {
        stakingBalance -= log.args.amount ?? 0n
        break
      }
      default:
        break
    }

    // Every time the balance hits zero, reset the timestamp
    if (stakingBalance === 0n) {
      earliestNonZeroStakingBalanceBlockNumber = log.blockNumber
      break
    }
  }

  // If the staking balance never got set, the user has never staked
  if (!earliestNonZeroStakingBalanceBlockNumber) return 0n

  // Get the block timestamp of the earliest non-zero staking balance
  const { timestamp: earliestNonZeroStakingBalanceTimestamp } = await client.getBlock({
    blockNumber: earliestNonZeroStakingBalanceBlockNumber,
  })

  const now = dayjs().unix()

  // Return the time the account has most recently had a non-zero staking balance to now
  return now - Number(earliestNonZeroStakingBalanceTimestamp)
}

export const useTimeInPoolQuery = ({ stakingAssetAccountAddress }: UseTimeInPoolProps) => {
  const queryKey = useMemo(
    () => ['timeInPool', stakingAssetAccountAddress],
    [stakingAssetAccountAddress],
  )
  const queryFn = useMemo(
    () =>
      stakingAssetAccountAddress
        ? () => getTimeInPoolSeconds(stakingAssetAccountAddress)
        : skipToken,
    [stakingAssetAccountAddress],
  )

  const timeInPoolQuery = useQuery({
    queryKey,
    queryFn,
  })

  return timeInPoolQuery
}
