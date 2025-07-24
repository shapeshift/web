import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { useSuspenseQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useMemo } from 'react'

import { getConfig } from '@/config'
import {
  ActionStatus,
  ActionType,
  GenericTransactionDisplayType,
} from '@/state/slices/actionSlice/types'
import { selectWalletGenericTransactionActionsSorted } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type TcyStaker = {
  amount: string
  asset: string
}

export const useTcyStaker = (accountId: AccountId | undefined) => {
  const allGenericActions = useAppSelector(selectWalletGenericTransactionActionsSorted)

  const completeTcyStakingActionCount = useMemo(() => {
    return allGenericActions.filter(
      action =>
        action.transactionMetadata.displayType === GenericTransactionDisplayType.TCY &&
        [ActionType.Withdraw, ActionType.Deposit].includes(action.type) &&
        action.status === ActionStatus.Complete,
    ).length
  }, [allGenericActions])

  return useSuspenseQuery({
    queryKey: ['tcy-staker', accountId, completeTcyStakingActionCount],
    queryFn: async (): Promise<TcyStaker | null> => {
      if (!accountId) return null

      const address = fromAccountId(accountId).account

      try {
        const { data } = await axios.get<TcyStaker>(
          `${getConfig().VITE_THORCHAIN_NODE_URL}/thorchain/tcy_staker/${address}`,
        )
        return data
      } catch (e) {
        console.error('Error fetching TCY staker', e)
        return null
      }
    },
    staleTime: 60_000,
  })
}
