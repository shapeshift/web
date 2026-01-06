import type { ChainId } from '@shapeshiftoss/caip'
import { skipToken, useQuery } from '@tanstack/react-query'

import { yieldxyzApi } from '@/lib/yieldxyz/api'
import { augmentYieldBalances } from '@/lib/yieldxyz/augment'
import type { AugmentedYieldBalance } from '@/lib/yieldxyz/types'

type UseYieldBalancesParams = {
  yieldId: string
  address: string
  chainId?: ChainId
}

export const useYieldBalances = ({ yieldId, address, chainId }: UseYieldBalancesParams) => {
  return useQuery<AugmentedYieldBalance[]>({
    queryKey: ['yieldxyz', 'balances', yieldId, address],
    queryFn:
      yieldId && address
        ? async () => {
            const data = await yieldxyzApi.getYieldBalances(yieldId, address)
            return augmentYieldBalances(data.balances, chainId)
          }
        : skipToken,
    staleTime: Infinity,
  })
}
