import { useQueries } from '@tanstack/react-query'
import { useMemo } from 'react'

import { yieldxyzApi } from '@/lib/yieldxyz/api'
import { augmentYield } from '@/lib/yieldxyz/augment'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'

export const useYieldsByIds = (yieldIds: string[]) => {
  // Deduplicate IDs
  const uniqueIds = useMemo(() => Array.from(new Set(yieldIds)), [yieldIds])

  const results = useQueries({
    queries: uniqueIds.map(id => ({
      queryKey: ['yieldxyz', 'yield', id],
      queryFn: async () => {
        const yieldDto = await yieldxyzApi.getYield(id)
        return augmentYield(yieldDto)
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled: !!id,
    })),
  })

  const isLoading = results.some(r => r.isLoading)
  const isError = results.some(r => r.isError)

  const yields = useMemo(() => {
    return results.map(r => r.data).filter((y): y is AugmentedYieldDto => !!y)
  }, [results])

  return { yields, isLoading, isError }
}
