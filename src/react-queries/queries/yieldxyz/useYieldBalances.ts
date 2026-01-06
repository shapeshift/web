import { useQuery } from '@tanstack/react-query'

import { yieldxyzApi } from '@/lib/yieldxyz/api'
import type { YieldBalancesResponse } from '@/lib/yieldxyz/types'

type UseYieldBalancesParams = {
  yieldId: string
  address: string
}

const yieldBalancesQueryKey = (
  params: UseYieldBalancesParams,
): ['yieldBalances', UseYieldBalancesParams] => ['yieldBalances', params]

export const useYieldBalances = (params: UseYieldBalancesParams) =>
  useQuery({
    queryKey: yieldBalancesQueryKey(params),
    queryFn: async (): Promise<YieldBalancesResponse> => {
      const response = await yieldxyzApi.getYieldBalances(params.yieldId, params.address)
      return response
    },
    staleTime: 30_000,
    enabled: !!params.yieldId && !!params.address,
  })

export type UseYieldBalancesReturn = ReturnType<typeof useYieldBalances>['data']
