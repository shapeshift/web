import { useQuery } from '@tanstack/react-query'

import { getYields } from '@/lib/yieldxyz/api'
import { augmentYield } from '@/lib/yieldxyz/augment'
import { isSupportedYieldNetwork } from '@/lib/yieldxyz/constants'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'

export const useYields = (params?: { network?: string; provider?: string }) => {
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

      return allItems.filter(item => isSupportedYieldNetwork(item.network)).map(augmentYield)
    },
    staleTime: 60 * 1000,
  })
}
