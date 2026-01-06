import { useQuery } from '@tanstack/react-query'

import { yieldxyzApi } from '@/lib/yieldxyz/api'
import { augmentYield } from '@/lib/yieldxyz/augment'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'

export const useYields = (params?: { network?: string; limit?: number; offset?: number }) => {
  return useQuery<AugmentedYieldDto[]>({
    queryKey: ['yieldxyz', 'yields', params],
    queryFn: async () => {
      const data = await yieldxyzApi.getYields(params)
      return data.items.map(augmentYield)
    },
    staleTime: 60 * 1000,
  })
}
