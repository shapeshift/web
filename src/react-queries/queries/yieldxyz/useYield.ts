import { useQuery } from '@tanstack/react-query'

import { getYield } from '@/lib/yieldxyz/api'
import { augmentYield } from '@/lib/yieldxyz/augment'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'

export const useYield = (yieldId: string) => {
  return useQuery<AugmentedYieldDto>({
    queryKey: ['yieldxyz', 'yield', yieldId],
    queryFn: async () => {
      if (!yieldId) throw new Error('yieldId is required')
      const result = await getYield(yieldId)
      return augmentYield(result)
    },
    enabled: !!yieldId,
    staleTime: 60 * 1000,
  })
}
