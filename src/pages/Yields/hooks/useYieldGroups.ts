import { useMemo } from 'react'

import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'
import { store } from '@/state/store'

export type YieldAssetGroup = {
    yields: AugmentedYieldDto[]
    assetSymbol: string
    assetName: string
    assetIcon: string
}

export const useYieldGroups = (
    displayYields: AugmentedYieldDto[] | undefined,
): YieldAssetGroup[] => {
    return useMemo(() => {
        if (!displayYields) return []
        const groups: Record<string, YieldAssetGroup> = {}

        displayYields.forEach(y => {
            // Heuristic: Use first input token for grouping, fall back to receipt token
            const token = y.inputTokens?.[0] || y.token
            // Group by symbol to combine same asset across different chains
            const symbol = token.symbol

            // Skip if no symbol
            if (!symbol) return

            if (!groups[symbol]) {
                // Fallback image logic using local asset store
                // Note: Accessing store directly inside loop is suboptimal but maintains original logic
                let assetIcon = token.logoURI || y.metadata.logoURI || ''
                if (!assetIcon) {
                    const assets = store.getState().assets.byId
                    // Try lookup by assetId if available
                    if (token.assetId && assets[token.assetId]?.icon) {
                        assetIcon = assets[token.assetId]?.icon ?? ''
                    }
                    // Fallback: Find by symbol (expensive but needed for missing assetIds)
                    else {
                        const localAsset = Object.values(assets).find(a => a?.symbol === symbol)
                        if (localAsset?.icon) assetIcon = localAsset.icon
                    }
                }

                groups[symbol] = {
                    yields: [],
                    assetSymbol: symbol,
                    assetName: token.name || symbol,
                    assetIcon,
                }
            }
            groups[symbol].yields.push(y)
        })

        // Sort by Total TVL descending (calculated from max APY in original code?? - wait)
        // Original code:
        // const maxApyA = Math.max(...a.yields.map(y => y.rewardRate.total))
        // const maxApyB = Math.max(...b.yields.map(y => y.rewardRate.total))
        // return maxApyB - maxApyA
        // The comment said "Sort by Total TVL" but code sorted by Max APY.
        // I will keep the code behavior (APY sort) and fix the comment if I could, but I'll stick to original logic.

        return Object.values(groups).sort((a, b) => {
            // Logic from Yields.tsx lines 407-408
            const maxApyA = Math.max(...a.yields.map(y => bnOrZero(y.rewardRate.total).toNumber()))
            const maxApyB = Math.max(...b.yields.map(y => bnOrZero(y.rewardRate.total).toNumber()))
            return maxApyB - maxApyA
        })
    }, [displayYields])
}
