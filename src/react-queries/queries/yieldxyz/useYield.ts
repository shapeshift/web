import { useQuery } from '@tanstack/react-query'

import { yieldxyzApi } from '@/lib/yieldxyz/api'

const yieldQueryKey = (yieldId: string): ['yield', string] => ['yield', yieldId]

export const useYield = (yieldId: string) =>
  useQuery({
    queryKey: yieldQueryKey(yieldId),
    queryFn: async () => {
      const response = await yieldxyzApi.getYield(yieldId)
      return response
    },
    staleTime: 60_000,
    enabled: !!yieldId,
  })

export type UseYieldReturn = ReturnType<typeof useYield>['data']
