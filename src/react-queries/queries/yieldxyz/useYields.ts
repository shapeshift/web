import { useQuery } from '@tanstack/react-query'

import { yieldxyzApi } from '@/lib/yieldxyz/api'
import type { YieldDto } from '@/lib/yieldxyz/types'
import { filterSupportedYields } from '@/lib/yieldxyz/utils'

type UseYieldsParams = {
  network?: string
  provider?: string
  limit?: number
  offset?: number
}

const yieldsQueryKey = (params: UseYieldsParams = {}): ['yields', UseYieldsParams] => [
  'yields',
  params,
]

export const useYields = (params: UseYieldsParams = {}) =>
  useQuery({
    queryKey: yieldsQueryKey(params),
    queryFn: async () => {
      const response = await yieldxyzApi.getYields(params)
      return response.items
    },
    select: (data: YieldDto[]) => filterSupportedYields(data),
    staleTime: 60_000,
  })

export type UseYieldsReturn = ReturnType<typeof useYields>['data']
