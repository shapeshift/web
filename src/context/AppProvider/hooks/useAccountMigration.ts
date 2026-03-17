import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

import { portfolio } from '@/state/slices/portfolioSlice/portfolioSlice'
import type { WalletId } from '@/state/slices/portfolioSlice/portfolioSliceCommon'
import { useAppDispatch } from '@/state/store'

export const useAccountMigration = () => {
  const queryClient = useQueryClient()
  const dispatch = useAppDispatch()

  const migrateAccounts = useCallback(
    (walletId: WalletId) => {
      // Clear all non-EVM accounts so they can be re-derived with the new derivation mode
      dispatch(portfolio.actions.clearNonEvmAccountsForWallet(walletId))

      // Invalidate the discover accounts query to trigger re-derivation
      queryClient.invalidateQueries({
        queryKey: ['useDiscoverAccounts'],
        exact: false,
        refetchType: 'all',
      })
    },
    [dispatch, queryClient],
  )

  return { migrateAccounts }
}
