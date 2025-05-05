import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { useSuspenseQuery } from '@tanstack/react-query'
import axios from 'axios'

import { getConfig } from '@/config'

type TcyStaker = {
  amount: string
  asset: string
}

export const useTcyStaker = (accountId: AccountId | undefined) => {
  return useSuspenseQuery({
    queryKey: ['tcy-staker', accountId],
    queryFn: async (): Promise<TcyStaker | null> => {
      if (!accountId) return null

      const address = fromAccountId(accountId).account

      try {
        const { data } = await axios.get<{ tcy_staker: TcyStaker }>(
          `${getConfig().VITE_THORCHAIN_NODE_URL}/thorchain/tcy_staker/${address}`,
        )
        return data.tcy_staker
      } catch (e) {
        console.error('Error fetching TCY staker', e)
        return null
      }
    },
    staleTime: 60_000,
  })
}
