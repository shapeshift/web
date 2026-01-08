import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'

import { getConfig } from '@/config'
import { useAllYieldBalances } from '@/react-queries/queries/yieldxyz/useAllYieldBalances'
import { useYields } from '@/react-queries/queries/yieldxyz/useYields'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type UseYieldOpportunitiesProps = {
  assetId: AssetId
  accountId?: AccountId
}

export const useYieldOpportunities = ({ assetId, accountId }: UseYieldOpportunitiesProps) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const { data: yields, isLoading: isYieldsLoading } = useYields()

  const balanceOptions = useMemo(() => (accountId ? { accountIds: [accountId] } : {}), [accountId])
  const { data: allBalances, isLoading: isBalancesLoading } = useAllYieldBalances(balanceOptions)

  const multiAccountEnabled = getConfig().VITE_FEATURE_YIELD_MULTI_ACCOUNT

  const matchingYields = useMemo(() => {
    if (!yields?.all || !asset) return []

    return yields.all.filter(yieldItem => {
      // 1. Primary Token Match
      const matchesToken = yieldItem.token.assetId === assetId
      // 2. Input Tokens Match
      const matchesInput = yieldItem.inputTokens.some(t => t.assetId === assetId)

      return matchesToken || matchesInput
    })
  }, [yields, asset, assetId])

  const accountBalances = useMemo(() => {
    if (multiAccountEnabled && !accountId) {
      throw new Error('Multi-account yield not yet implemented')
    }

    if (!allBalances || !matchingYields.length) return {}

    return matchingYields.reduce(
      (acc, yieldItem) => {
        const itemBalances = allBalances[yieldItem.id] || []

        const filtered = itemBalances.filter(b => {
          if (accountId) {
            return b.address.toLowerCase() === fromAccountId(accountId).account.toLowerCase()
          }
          return true
        })

        if (filtered.length > 0) {
          acc[yieldItem.id] = filtered
        }

        return acc
      },
      {} as Record<string, any>,
    )
  }, [allBalances, matchingYields, accountId, multiAccountEnabled])

  return {
    yields: matchingYields,
    balances: accountBalances,
    isLoading: isYieldsLoading || isBalancesLoading,
    totalActivePositions: Object.keys(accountBalances).length,
  }
}
