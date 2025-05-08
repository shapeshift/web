import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { useSuspenseQuery } from '@tanstack/react-query'
import axios from 'axios'

import { getConfig } from '@/config'

type TcyDistribution = {
  amount: string
  data: string
}

type TcyDistributor = {
  address: string
  distributions: TcyDistribution[]
  total: string
}

export const useTcyDistributor = (accountId: AccountId | undefined) => {
  return useSuspenseQuery({
    queryKey: ['tcy-distributor', accountId],
    queryFn: async (): Promise<TcyDistributor | null> => {
      if (!accountId) return null

      const address = fromAccountId(accountId).account

      try {
        const { data } = await axios.get<TcyDistributor>(
          `${getConfig().VITE_THORCHAIN_MIDGARD_URL}/tcy/distribution/${address}`,
        )
        return data
      } catch (e) {
        console.error('Error fetching TCY distributooor', e)
        return null
      }
    },
    staleTime: 60_000,
  })
}
