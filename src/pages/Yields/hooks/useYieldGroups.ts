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
        const groups: Record<string, AugmentedYieldDto[]> = {}

        // 1. Group by symbol
        displayYields.forEach(y => {
            const token = y.inputTokens?.[0] || y.token
            const symbol = token.symbol
            if (!symbol) return

            if (!groups[symbol]) {
                groups[symbol] = []
            }
            groups[symbol].push(y)
        })

        // 2. Reduce to YieldAssetGroup with best metadata
        const assetGroups = Object.entries(groups).map(([symbol, yields]) => {
            // Find "Best" representative yield for metadata
            // Prioritize:
            // 1. Yield with matching Store Asset (Native/Known)
            // 2. Yield with highest TVL
            // 3. First yield

            const assets = store.getState().assets.byId

            const bestYield = yields.reduce((prev, current) => {
                const prevToken = prev.inputTokens?.[0] || prev.token
                const currToken = current.inputTokens?.[0] || current.token

                // If current has store asset and prev doesn't, prefer current
                const prevHasAsset = prevToken.assetId && assets[prevToken.assetId]
                const currHasAsset = currToken.assetId && assets[currToken.assetId]

                if (currHasAsset && !prevHasAsset) return current
                if (prevHasAsset && !currHasAsset) return prev

                // Heuristic: Prefer names that don't look "Wrapped" or "Pegged" if one does and other doesn't
                // (Simple length check often works: "Tron" < "Binance-Peg TRX")
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
                // Fallback by symbol
                const localAsset = Object.values(assets).find(a => a?.symbol === symbol)
                if (localAsset?.icon) assetIcon = localAsset.icon
            }

            return {
                yields,
                assetSymbol: symbol,
                assetName: representativeToken.name || symbol,
                assetIcon
            }
        })

        // 3. Sort by Max APY (consistent with previous logic)
        return assetGroups.sort((a, b) => {
            const maxApyA = Math.max(...a.yields.map(y => bnOrZero(y.rewardRate.total).toNumber()))
            const maxApyB = Math.max(...b.yields.map(y => bnOrZero(y.rewardRate.total).toNumber()))
            return maxApyB - maxApyA
        })
    }, [displayYields])
}
