import { useQuery } from '@tanstack/react-query'

import { getProviders } from '@/lib/yieldxyz/api'
import type { ProviderDto } from '@/lib/yieldxyz/types'

const YIELD_XYZ_PROVIDER_ID = 'yield-xyz'
// The yield-xyz provider logoURI from the API (https://assets.stakek.it/providers/yield-xyz.svg) returns 403
const YIELD_XYZ_LOCAL_LOGO_URI = '/images/providers/yield-xyz.png'

export const useYieldProviders = () => {
  return useQuery<ProviderDto[], Error, ProviderDto[]>({
    queryKey: ['yieldxyz', 'providers'],
    queryFn: async () => {
      const data = await getProviders({ limit: 100 })
      return data.items
    },
    select: providers =>
      providers.map(provider =>
        provider.id === YIELD_XYZ_PROVIDER_ID
          ? { ...provider, logoURI: YIELD_XYZ_LOCAL_LOGO_URI }
          : provider,
      ),
    staleTime: Infinity,
    gcTime: Infinity,
  })
}
