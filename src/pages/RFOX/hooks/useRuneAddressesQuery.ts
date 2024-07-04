import { skipToken, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { queryClient } from 'context/QueryClientProvider/queryClient'
import { assertUnreachable } from 'lib/utils'

import type { RFOXAccountLog } from '../types'
import { getAccountLogsQueryFn, getAccountLogsQueryKey } from './useAccountLogsQuery'

type UseRuneAddressesQueryProps<SelectData = string[]> = {
  stakingAssetAccountAddress: string | undefined
  select?: (runeAddresses: string[]) => SelectData
}

const getRuneAddressesFromLogs = (logs: RFOXAccountLog[]) => {
  const runeAddresses = new Set<string>()

  for (const log of logs) {
    const runAddress = (() => {
      const eventName = log.eventName
      switch (eventName) {
        case 'SetRuneAddress':
          return log.args.newRuneAddress
        case 'Stake':
          return log.args.runeAddress
        case 'Withdraw':
        case 'Unstake':
          return
        default:
          assertUnreachable(eventName)
      }
    })()

    if (runAddress) runeAddresses.add(runAddress)
  }

  return Array.from(runeAddresses)
}

export const useRuneAddressesQuery = <SelectData = string[]>({
  stakingAssetAccountAddress,
  select,
}: UseRuneAddressesQueryProps<SelectData>) => {
  const queryKey = useMemo(
    () => ['runeAddresses', stakingAssetAccountAddress],
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

            return getRuneAddressesFromLogs(sortedAccountLogs)
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
