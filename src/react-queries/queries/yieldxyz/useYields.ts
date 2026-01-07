import { useQuery } from '@tanstack/react-query'
import type { Asset } from '@shapeshiftoss/types'

import { useMemo } from 'react'

import { getYields } from '@/lib/yieldxyz/api'
import { augmentYield } from '@/lib/yieldxyz/augment'
import { isSupportedYieldNetwork, SUPPORTED_YIELD_NETWORKS } from '@/lib/yieldxyz/constants'
import type { AugmentedYieldDto, YieldDto } from '@/lib/yieldxyz/types'
import { selectAssets } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export const useYields = (params?: { network?: string; provider?: string }) => {

  const { data: queryData, ...queryResult } = useQuery({
    queryKey: ['yieldxyz', 'yields', params],
    queryFn: async () => {
      let allItems: YieldDto[] = []
      let offset = 0
      const limit = 100

      while (true) {
        const data = await getYields({
          ...params,
          networks: SUPPORTED_YIELD_NETWORKS as string[],
          limit,
          offset,
        })
        allItems = [...allItems, ...data.items]
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

      const all = qualityYields
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
    staleTime: 5 * 60 * 1000,
  })

  const assets = useAppSelector(selectAssets)

  const data = useMemo(() => {
    if (!queryData) return undefined

    const { byAssetSymbol } = queryData

    const symbolToAssetMap = new Map<string, Asset>()
    Object.values(assets).forEach(asset => {
      if (asset?.symbol && !symbolToAssetMap.has(asset.symbol)) {
        symbolToAssetMap.set(asset.symbol, asset)
      }
    })

    const assetMetadata: Record<string, { assetName: string; assetIcon: string; assetId?: string }> = {}

    Object.entries(byAssetSymbol).forEach(([symbol, yields]) => {
      const bestYield = yields.reduce((prev, current) => {
        const prevToken = prev.inputTokens?.[0] || prev.token
        const currToken = current.inputTokens?.[0] || current.token

        const prevHasAsset = prevToken.assetId && assets[prevToken.assetId]
        const currHasAsset = currToken.assetId && assets[currToken.assetId]

        if (currHasAsset && !prevHasAsset) return current
        if (prevHasAsset && !currHasAsset) return prev

        if (currToken.name && prevToken.name) {
          if (currToken.name.length < prevToken.name.length) return current
          if (prevToken.name.length < currToken.name.length) return prev
        }
        return prev
      }, yields[0])

      const representativeToken = bestYield.inputTokens?.[0] || bestYield.token

      let finalAssetId: string | undefined
      let assetIcon = representativeToken.logoURI || bestYield.metadata.logoURI || ''

      if (representativeToken.assetId && assets[representativeToken.assetId]) {
        finalAssetId = representativeToken.assetId
        assetIcon = assets[finalAssetId].icon
      } else {
        const localAsset = symbolToAssetMap.get(symbol)
        if (localAsset) {
          finalAssetId = localAsset.assetId
          assetIcon = localAsset.icon
        }
      }

      assetMetadata[symbol] = {
        assetName: representativeToken.name || symbol,
        assetIcon,
        assetId: finalAssetId,
      }
    })

    return {
      ...queryData,
      meta: {
        ...queryData.meta,
        assetMetadata,
      },
    }
  }, [queryData, assets])

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

