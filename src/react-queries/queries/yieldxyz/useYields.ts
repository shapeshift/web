import { useQuery } from '@tanstack/react-query'

import { getYields } from '@/lib/yieldxyz/api'
import { augmentYield } from '@/lib/yieldxyz/augment'
import { isSupportedYieldNetwork } from '@/lib/yieldxyz/constants'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'

export const useYields = (params?: { network?: string; provider?: string }) => {

  return useQuery({
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

      const all = allItems
        .filter(item => isSupportedYieldNetwork(item.network))
        .map(augmentYield)

      const byId = all.reduce((acc, item) => {
        acc[item.id] = item
        return acc
      }, {} as Record<string, AugmentedYieldDto>)

      const ids = all.map(item => item.id)

      const byAssetSymbol: Record<string, AugmentedYieldDto[]> = {}
      const networksSet = new Set<string>()
      const providersSet = new Set<string>()

      all.forEach(item => {
        // Group by Symbol
        const symbol = (item.inputTokens?.[0] || item.token).symbol
        if (symbol) {
          if (!byAssetSymbol[symbol]) byAssetSymbol[symbol] = []
          byAssetSymbol[symbol].push(item)
        }

        // Collect Filters
        networksSet.add(item.network)
        providersSet.add(item.providerId)
      })

      const meta = {
        networks: Array.from(networksSet),
        providers: Array.from(providersSet),
      }

      return { all, byId, ids, byAssetSymbol, meta }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes (increased from 60s)
  })
}

