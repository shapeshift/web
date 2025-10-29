import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'

import { getHighestUserCurrencyBalanceAccountByAssetId } from '@/state/slices/portfolioSlice/utils'
import { selectPortfolioAssetAccountBalancesSortedUserCurrency } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type UseAccountSelectionArgs = {
  assetId: AssetId
  accountIds: AccountId[]
  defaultAccountId?: AccountId
  autoSelectHighestBalance?: boolean
}

/**
 * Hook for selecting the optimal account ID for a given asset.
 * Provides synchronous, race-condition-free account selection with clear priority:
 * 1. Highest balance account (if autoSelectHighestBalance=true)
 * 2. Validated defaultAccountId (if provided and exists in accountIds)
 * 3. First available account
 *
 * @param assetId - The asset ID to select an account for
 * @param accountIds - Available account IDs for this asset
 * @param defaultAccountId - Optional default account to use (must exist in accountIds)
 * @param autoSelectHighestBalance - If true, prioritize account with highest balance
 * @returns The selected account ID, or undefined if no accounts available
 */
export const useAccountSelection = ({
  assetId,
  accountIds,
  defaultAccountId,
  autoSelectHighestBalance,
}: UseAccountSelectionArgs): AccountId | undefined => {
  const accountIdAssetValues = useAppSelector(selectPortfolioAssetAccountBalancesSortedUserCurrency)

  // Extract only the balances for accounts that match the current assetId
  // Convert to stable string key to prevent infinite re-renders when object reference changes
  const balancesKey = useMemo(() => {
    const relevantBalances: Record<AccountId, string> = {}
    for (const accountId of accountIds) {
      const balance = accountIdAssetValues[accountId]?.[assetId]
      if (balance !== undefined) {
        relevantBalances[accountId] = balance
      }
    }
    return JSON.stringify(relevantBalances)
  }, [accountIds, accountIdAssetValues, assetId])

  return useMemo(() => {
    if (!accountIds.length) return undefined

    // 1. Validate explicit default exists in accountIds
    const validatedDefault = accountIds.find(id => id === defaultAccountId)

    // 2. Compute highest balance account (if requested)
    const highestBalance = autoSelectHighestBalance
      ? getHighestUserCurrencyBalanceAccountByAssetId(accountIdAssetValues, assetId)
      : undefined

    // 3. Fallback to first account
    const firstAccount = accountIds[0]

    // 4. Clear priority: highest balance > validated default > first
    return highestBalance ?? validatedDefault ?? firstAccount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountIds, defaultAccountId, autoSelectHighestBalance, assetId, balancesKey])
}
