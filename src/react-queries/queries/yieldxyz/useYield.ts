import { useQuery, useQueryClient } from '@tanstack/react-query'

import { getYield } from '@/lib/yieldxyz/api'
import { augmentYield } from '@/lib/yieldxyz/augment'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'

export const useYield = (yieldId: string) => {
  const queryClient = useQueryClient()

  return useQuery<AugmentedYieldDto>({
    queryKey: ['yieldxyz', 'yield', yieldId],
    queryFn: async () => {
      if (!yieldId) throw new Error('yieldId is required')
      const result = await getYield(yieldId)
      return augmentYield(result)
    },
    enabled: !!yieldId,
    staleTime: 60 * 1000, // 1 minute
    // Use cached yield from the list if available (avoids redundant API call)
    initialData: () => {
      const cachedYields = queryClient.getQueryData<{
        all: AugmentedYieldDto[]
        byId: Record<string, AugmentedYieldDto>
      }>(['yieldxyz', 'yields', undefined])
      return cachedYields?.byId[yieldId]
    },
    initialDataUpdatedAt: () => {
      return queryClient.getQueryState(['yieldxyz', 'yields', undefined])?.dataUpdatedAt
    },
  })
}

