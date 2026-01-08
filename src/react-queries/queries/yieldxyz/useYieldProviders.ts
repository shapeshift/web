import { useQuery } from '@tanstack/react-query'

import { fetchProviders } from '@/lib/yieldxyz/api'
import type { ProviderDto } from '@/lib/yieldxyz/types'

const YIELD_XYZ_PROVIDER_ID = 'yield-xyz'
// The yield-xyz provider logoURI from the API (https://assets.stakek.it/providers/yield-xyz.svg) returns 403
const YIELD_XYZ_LOCAL_LOGO_URI = '/images/providers/yield-xyz.png'

export const useYieldProviders = () => {
  return useQuery<ProviderDto[], Error, Record<string, ProviderDto>>({
    queryKey: ['yieldxyz', 'providers'],
    queryFn: async () => {
      const allItems: ProviderDto[] = []
      let offset = 0
      const limit = 100

      while (true) {
        const data = await fetchProviders({ limit, offset })
        allItems.push(...data.items)
        if (data.items.length < limit) break
        offset += limit
      }

      return allItems
    },
    select: providers => {
      return providers.reduce(
        (acc, provider) => {
          const p =
            provider.id === YIELD_XYZ_PROVIDER_ID
              ? { ...provider, logoURI: YIELD_XYZ_LOCAL_LOGO_URI }
              : provider
          acc[p.id] = p
          return acc
        },
        {} as Record<string, ProviderDto>,
      )
    },
    staleTime: Infinity,
    gcTime: Infinity,
  })
}
