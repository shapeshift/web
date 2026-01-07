import { useQuery, useQueryClient } from '@tanstack/react-query'

import { getYields } from '@/lib/yieldxyz/api'
import { augmentYield } from '@/lib/yieldxyz/augment'
import { isSupportedYieldNetwork } from '@/lib/yieldxyz/constants'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'

export const useYields = (params?: { network?: string; provider?: string }) => {
  const queryClient = useQueryClient()

  return useQuery<AugmentedYieldDto[]>({
    queryKey: ['yieldxyz', 'yields', params],
    queryFn: async () => {
      let allItems: any[] = []
      let offset = 0
      const limit = 100

      while (true) {
        const data = await getYields({ ...params, limit, offset })
        allItems = [...allItems, ...data.items]
        if (data.items.length < limit) break
        offset += limit
      }

      const augmentedYields = allItems
        .filter(item => isSupportedYieldNetwork(item.network))
        .map(augmentYield)

      // Pre-populate individual yield cache entries to avoid redundant fetches
      augmentedYields.forEach(yieldItem => {
        queryClient.setQueryData(['yieldxyz', 'yield', yieldItem.id], yieldItem)
      })

      return augmentedYields
    },
    staleTime: 5 * 60 * 1000, // 5 minutes (increased from 60s)
  })
}

