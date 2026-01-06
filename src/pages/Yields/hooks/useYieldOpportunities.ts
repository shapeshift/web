import { useMemo } from 'react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { useAllYieldBalances } from '@/react-queries/queries/yieldxyz/useAllYieldBalances'
import { useYields } from '@/react-queries/queries/yieldxyz/useYields'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'
import { getConfig } from '@/config'

type UseYieldOpportunitiesProps = {
    assetId: AssetId
    accountId?: AccountId
}

export const useYieldOpportunities = ({ assetId, accountId }: UseYieldOpportunitiesProps) => {
    const asset = useAppSelector(state => selectAssetById(state, assetId))
    const { data: yields, isLoading: isYieldsLoading } = useYields({ network: 'base' }) // TODO: remove hardcoded network when ready
    const { data: allBalances, isLoading: isBalancesLoading } = useAllYieldBalances()

    const multiAccountEnabled = getConfig().VITE_FEATURE_YIELD_MULTI_ACCOUNT

    const matchingYields = useMemo(() => {
        if (!yields || !asset) return []

        return yields.filter(yieldItem => {
            // 1. Primary Token Match
            const matchesToken = yieldItem.token.assetId === assetId
            // 2. Input Tokens Match
            const matchesInput = yieldItem.inputTokens.some(t => t.assetId === assetId)

            return matchesToken || matchesInput
        })
    }, [yields, asset, assetId])

    const accountBalances = useMemo(() => {
        if (!allBalances || !matchingYields.length) return {}

        const balances: Record<string, any> = {}

        matchingYields.forEach(yieldItem => {
            const itemBalances = allBalances[yieldItem.id] || []

            const filtered = itemBalances.filter(b => {
                // If specific account requested
                if (accountId) {
                    return b.address.toLowerCase() === fromAccountId(accountId).account.toLowerCase()
                }

                // If multi-account disabled, we leave it as-is for now (showing all connected).
                // In a perfect world we would filter for 'account 0' but we lack that context easily here.
                // Assuming 'useAllYieldBalances' behaves correctly for enabled wallets.
                if (!multiAccountEnabled) {
                    return true
                }

                return true
            })

            if (filtered.length > 0) {
                balances[yieldItem.id] = filtered
            }
        })

        return balances
    }, [allBalances, matchingYields, accountId, multiAccountEnabled])

    return {
        yields: matchingYields,
        balances: accountBalances,
        isLoading: isYieldsLoading || isBalancesLoading,
        totalActivePositions: Object.keys(accountBalances).length,
    }
}
