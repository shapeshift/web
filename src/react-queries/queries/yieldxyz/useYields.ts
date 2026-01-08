import type { Asset } from '@shapeshiftoss/types'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { fetchYields } from '@/lib/yieldxyz/api'
import { augmentYield } from '@/lib/yieldxyz/augment'
import { isSupportedYieldNetwork, SUPPORTED_YIELD_NETWORKS } from '@/lib/yieldxyz/constants'
import type { AugmentedYieldDto, YieldDto } from '@/lib/yieldxyz/types'
import { selectAssets } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export const useYields = (params?: { network?: string; provider?: string }) => {
  const { data: allYields, ...queryResult } = useQuery({
    queryKey: ['yieldxyz', 'yields'],
    queryFn: async () => {
      const allItems: YieldDto[] = []
      let offset = 0
      const limit = 100

      while (true) {
        const data = await fetchYields({
          networks: SUPPORTED_YIELD_NETWORKS as string[],
          limit,
          offset,
        })
        allItems.push(...data.items)
        if (data.items.length < limit) break
        offset += limit
      }

      const qualityYields = allItems.filter(item => !isLowQualityYield(item))

      // Sort by TVL descending (Highest TVL first)
      qualityYields.sort((a, b) => {
        const tvlA = Number(a.statistics?.tvlUsd ?? 0)
        const tvlB = Number(b.statistics?.tvlUsd ?? 0)
        return tvlB - tvlA
      })

      return qualityYields.filter(item => isSupportedYieldNetwork(item.network)).map(augmentYield)
    },
    staleTime: 5 * 60 * 1000,
  })

  const assets = useAppSelector(selectAssets)

  const data = useMemo(() => {
    if (!allYields) return undefined

    // Apply Filters Client-Side
    let filtered = allYields
    if (params?.network) {
      filtered = filtered.filter(y => y.network === params.network)
    }
    if (params?.provider) {
      filtered = filtered.filter(y => y.providerId === params.provider)
    }

    // Build Indices
    const byId = filtered.reduce(
      (acc, item) => {
        acc[item.id] = item
        return acc
      },
      {} as Record<string, AugmentedYieldDto>,
    )

    const ids = filtered.map(item => item.id)

    // Use GLOBAL networks/providers so dropdowns don't shrink when filtered
    const globalNetworks = [...new Set(allYields.map(item => item.network))]
    const globalProviders = [...new Set(allYields.map(item => item.providerId))]

    const byAssetSymbol = filtered.reduce<Record<string, AugmentedYieldDto[]>>((acc, item) => {
      const symbol = (item.inputTokens?.[0] || item.token).symbol
      if (symbol) {
        if (!acc[symbol]) acc[symbol] = []
        acc[symbol].push(item)
      }
      return acc
    }, {})

    const symbolToAssetMap = Object.values(assets).reduce<Map<string, Asset>>((map, asset) => {
      if (asset?.symbol && !map.has(asset.symbol)) {
        map.set(asset.symbol, asset)
      }
      return map
    }, new Map())

    const assetMetadata = Object.fromEntries(
      Object.entries(byAssetSymbol).map(([symbol, yields]) => {
        const bestYield = yields.reduce((prev, current) => {
          const prevToken = prev.inputTokens?.[0] || prev.token
          const currToken = current.inputTokens?.[0] || current.token

          const prevHasAsset = prevToken.assetId && assets[prevToken.assetId]
          const currHasAsset = currToken.assetId && assets[currToken.assetId]

          if (currHasAsset && !prevHasAsset) return current
          if (prevHasAsset && !currHasAsset) return prev

          const prevIsNative = prevToken.assetId?.includes('slip44')
          const currIsNative = currToken.assetId?.includes('slip44')
          if (currIsNative && !prevIsNative) return current
          if (prevIsNative && !currIsNative) return prev

          if (currToken.name && prevToken.name) {
            if (currToken.name.length < prevToken.name.length) return current
            if (prevToken.name.length < currToken.name.length) return prev
          }
          return prev
        }, yields[0])

        const representativeToken = bestYield.inputTokens?.[0] || bestYield.token
        const defaultIcon = representativeToken.logoURI || bestYield.metadata.logoURI || ''

        const resolvedAsset = (() => {
          if (representativeToken.assetId && assets[representativeToken.assetId]) {
            return {
              assetId: representativeToken.assetId,
              icon: assets[representativeToken.assetId]?.icon ?? defaultIcon,
            }
          }
          const localAsset = symbolToAssetMap.get(symbol)
          if (localAsset) {
            return { assetId: localAsset.assetId, icon: localAsset.icon ?? defaultIcon }
          }
          return { assetId: undefined, icon: defaultIcon }
        })()

        return [
          symbol,
          {
            assetName: representativeToken.name || symbol,
            assetIcon: resolvedAsset.icon,
            assetId: resolvedAsset.assetId,
          },
        ] as const
      }),
    )

    return {
      all: filtered,
      byId,
      ids,
      byAssetSymbol,
      meta: {
        networks: globalNetworks,
        providers: globalProviders,
        assetMetadata,
      },
    }
  }, [allYields, assets, params?.network, params?.provider])

  return { ...queryResult, data }
}

const isLowQualityYield = (yieldItem: YieldDto): boolean => {
  const tvl = Number(yieldItem.statistics?.tvlUsd ?? 0)
  const apy = yieldItem.rewardRate?.total ?? 0

  // Keep zero TVL (upstream bug), high TVL, or decent APY
  if (tvl === 0) return false // keep - likely indexing bug
  if (tvl >= 100000) return false // keep - significant TVL
  if (apy >= 0.01) return false // keep - decent APY (1%+)

  return true // filter out - low TVL AND low APY
}
