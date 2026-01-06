import { useQuery } from '@tanstack/react-query'

import { yieldxyzApi } from '@/lib/yieldxyz/api'
import type { ProviderDto } from '@/lib/yieldxyz/types'

export const useYieldProviders = () => {
    return useQuery<ProviderDto[]>({
        queryKey: ['yieldxyz', 'providers'],
        queryFn: async () => {
            const data = await yieldxyzApi.getProviders()
            return data.items
        },
        staleTime: Infinity, // Cache forever
        gcTime: Infinity, // Keep in cache forever
    })
}
