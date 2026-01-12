import { skipToken, useQuery } from '@tanstack/react-query'

import { fetchYieldValidators } from '@/lib/yieldxyz/api'
import type { ValidatorDto } from '@/lib/yieldxyz/types'

export const useYieldValidators = (yieldId: string, enabled: boolean = true) => {
  return useQuery<ValidatorDto[], Error, ValidatorDto[]>({
    queryKey: ['yieldxyz', 'validators', yieldId],
    queryFn:
      yieldId && enabled
        ? async () => {
            const data = await fetchYieldValidators(yieldId)
            return data.items
          }
        : skipToken,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
  })
}
