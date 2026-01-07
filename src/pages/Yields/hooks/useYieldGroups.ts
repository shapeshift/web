import { useMemo } from 'react'

import { useSymbolToAssetMap } from './useSymbolToAssetMap'

import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'
import { selectAssets } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export type YieldAssetGroup = {
  yields: AugmentedYieldDto[]
  assetSymbol: string
  assetName: string
  assetIcon: string
}

type YieldMetadata = {
  assetName: string
  assetIcon: string
}

/**
 * Calculates metadata (icon/name) for consistent display across groups.
 * This is expensive (heuristics, loops), so we want to run it once for the whole dataset
 * and output a map that can be queried O(1).
 */
const useYieldGroupMetadata = (
  allYields: AugmentedYieldDto[] | undefined,
): Record<string, YieldMetadata> => {
  const symbolToAssetMap = useSymbolToAssetMap()
  const assets = useAppSelector(selectAssets)

  return useMemo(() => {
    if (!allYields) return {}
    const groups: Record<string, AugmentedYieldDto[]> = {}

    // 1. Group ALL yields by symbol
    allYields.forEach(y => {
      const token = y.inputTokens?.[0] || y.token
      const symbol = token.symbol
      if (!symbol) return

      if (!groups[symbol]) {
        groups[symbol] = []
      }
      groups[symbol].push(y)
    })

    // 2. Compute metadata for each group
    const metadata: Record<string, YieldMetadata> = {}

    Object.entries(groups).forEach(([symbol, yields]) => {
      // Find "Best" representative yield for metadata
      const bestYield = yields.reduce((prev, current) => {
        const prevToken = prev.inputTokens?.[0] || prev.token
        const currToken = current.inputTokens?.[0] || current.token

        // If current has store asset and prev doesn't, prefer current
        const prevHasAsset = prevToken.assetId && assets[prevToken.assetId]
        const currHasAsset = currToken.assetId && assets[currToken.assetId]

        if (currHasAsset && !prevHasAsset) return current
        if (prevHasAsset && !currHasAsset) return prev

        // Heuristic: Prefer names that don't look "Wrapped" or "Pegged"
        if (currToken.name && prevToken.name) {
          if (currToken.name.length < prevToken.name.length) return current
          if (prevToken.name.length < currToken.name.length) return prev
        }

        return prev
      }, yields[0])

      const representativeToken = bestYield.inputTokens?.[0] || bestYield.token

      // Resolve Icon
      let assetIcon = representativeToken.logoURI || bestYield.metadata.logoURI || ''
      if (!assetIcon && representativeToken.assetId && assets[representativeToken.assetId]?.icon) {
        assetIcon = assets[representativeToken.assetId]?.icon ?? ''
      }
      if (!assetIcon) {
        // Fallback by symbol using the efficient map
        const localAsset = symbolToAssetMap.get(symbol)
        if (localAsset?.icon) assetIcon = localAsset.icon
      }

      metadata[symbol] = {
        assetName: representativeToken.name || symbol,
        assetIcon,
      }
    })

    return metadata
  }, [allYields, assets, symbolToAssetMap])
}

export const useYieldGroups = (
  allYields: AugmentedYieldDto[] | undefined,
  displayYields: AugmentedYieldDto[] | undefined,
): YieldAssetGroup[] => {
  // 1. Calculate metadata for ALL yields (Memoized, independent of filters)
  const metadataMap = useYieldGroupMetadata(allYields)

  // 2. Group the FILTERED yields (displayYields) and attach metadata (Fast O(1) lookup)
  return useMemo(() => {
    if (!displayYields) return []
    const groups: Record<string, AugmentedYieldDto[]> = {}

    displayYields.forEach(y => {
      const token = y.inputTokens?.[0] || y.token
      const symbol = token.symbol
      if (!symbol) return

      if (!groups[symbol]) {
        groups[symbol] = []
      }
      groups[symbol].push(y)
    })

    const assetGroups = Object.entries(groups).map(([symbol, yields]) => {
      const meta = metadataMap[symbol] || { assetName: symbol, assetIcon: '' }

      return {
        yields,
        assetSymbol: symbol,
        assetName: meta.assetName,
        assetIcon: meta.assetIcon,
      }
    })

    // 3. Sort by Max APY
    return assetGroups.sort((a, b) => {
      const maxApyA = Math.max(...a.yields.map(y => bnOrZero(y.rewardRate.total).toNumber()))
      const maxApyB = Math.max(...b.yields.map(y => bnOrZero(y.rewardRate.total).toNumber()))
      return maxApyB - maxApyA
    })
  }, [displayYields, metadataMap])
}
