import { useQuery } from '@tanstack/react-query'

import { yieldxyzApi } from '@/lib/yieldxyz/api'
import { augmentYield } from '@/lib/yieldxyz/augment'

export const useYield = (yieldId: string) => {
  return useQuery({
    queryKey: ['yieldxyz', 'yield', yieldId],
    queryFn: async () => {
      if (!yieldId) throw new Error('yieldId is required')
      return yieldxyzApi.getYield(yieldId)
    },
    select: augmentYield,
    enabled: !!yieldId,
    staleTime: 60 * 1000,
  })
}
