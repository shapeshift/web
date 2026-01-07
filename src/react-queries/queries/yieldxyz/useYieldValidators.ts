import { useQuery } from '@tanstack/react-query'

import { getYieldValidators } from '@/lib/yieldxyz/api'
import type { ValidatorDto } from '@/lib/yieldxyz/types'

export const useYieldValidators = (yieldId: string, enabled: boolean = true) => {
  return useQuery<ValidatorDto[], Error, ValidatorDto[]>({
    queryKey: ['yieldxyz', 'validators', yieldId],
    queryFn: async () => {
      const data = await getYieldValidators(yieldId)
      return data.items
    },
    enabled: enabled && !!yieldId,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  })
}
