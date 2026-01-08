import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query'

import { fetchYield } from '@/lib/yieldxyz/api'
import { augmentYield } from '@/lib/yieldxyz/augment'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'

export const useYield = (yieldId: string) => {
  const queryClient = useQueryClient()

  const getCachedYield = (): AugmentedYieldDto | undefined => {
    const cachedYields = queryClient.getQueryData<AugmentedYieldDto[]>(['yieldxyz', 'yields'])
    return cachedYields?.find(y => y.id === yieldId)
  }

  return useQuery<AugmentedYieldDto>({
    queryKey: ['yieldxyz', 'yield', yieldId],
    queryFn: yieldId
      ? async () => {
          const cached = getCachedYield()
          if (cached) return cached

          const result = await fetchYield(yieldId)
          return augmentYield(result)
        }
      : skipToken,
    enabled: !!yieldId,
    staleTime: 60 * 1000,
    initialData: getCachedYield,
    initialDataUpdatedAt: () => {
      return queryClient.getQueryState(['yieldxyz', 'yields'])?.dataUpdatedAt
    },
  })
}
