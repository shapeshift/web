import { RFOX_PROXY_CONTRACT_ADDRESS, viemClientByNetworkId } from '@shapeshiftoss/contracts'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { getAddress } from 'viem'
import { arbitrum } from 'viem/chains'

import { setRuneAddressEvent, stakeEvent, unstakeEvent, withdrawEvent } from '../constants'
import type { RFOXAccountLog } from '../types'
import { getRfoxContractCreationBlockNumber } from './helpers'

type UseAccountLogsProps<SelectData> = {
  stakingAssetAccountAddress: string | undefined
  select?: (sortedAccountLogs: RFOXAccountLog[]) => SelectData
}

const client = viemClientByNetworkId[arbitrum.id]

/**
 * WARNING: This is a very expensive operation and should only be used behind react-query to cache the result.
 *
 * i.e DO NOT EXPORT THIS FUNCTION
 */
const fetchAccountLogs = async (stakingAssetAccountAddress: string): Promise<RFOXAccountLog[]> => {
  const rfoxCreationBlockNumber = getRfoxContractCreationBlockNumber(RFOX_PROXY_CONTRACT_ADDRESS)

  try {
    const logsByEventType = await Promise.all(
      [setRuneAddressEvent, stakeEvent, unstakeEvent, withdrawEvent].map(
        (event): Promise<RFOXAccountLog[]> =>
          client.getLogs({
            address: RFOX_PROXY_CONTRACT_ADDRESS,
            event,
            fromBlock: rfoxCreationBlockNumber,
            args: {
              account: getAddress(stakingAssetAccountAddress),
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

export const getAccountLogsQueryKey = (stakingAssetAccountAddress: string | undefined) => [
  'accountLogs',
  stakingAssetAccountAddress,
]

export const getAccountLogsQueryFn = (stakingAssetAccountAddress: string | undefined) =>
  stakingAssetAccountAddress ? () => fetchAccountLogs(stakingAssetAccountAddress) : skipToken

export const useAccountLogsQuery = <SelectData>({
  stakingAssetAccountAddress,
  select,
}: UseAccountLogsProps<SelectData>) => {
  const queryKey = useMemo(
    () => getAccountLogsQueryKey(stakingAssetAccountAddress),
    [stakingAssetAccountAddress],
  )
  const queryFn = useMemo(
    () => getAccountLogsQueryFn(stakingAssetAccountAddress),
    [stakingAssetAccountAddress],
  )

  const accountLogsQuery = useQuery({
    queryKey,
    queryFn,
    select,
  })

  return accountLogsQuery
}
