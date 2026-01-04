import { useEffect, useRef } from 'react'

import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { accountService } from '@/lib/account/accountService'
import { selectEnabledWalletAccountIds } from '@/state/slices/selectors'
import { txHistoryApi } from '@/state/slices/txHistorySlice/txHistorySlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

export const usePortfolioFetch = () => {
  const dispatch = useAppDispatch()
  const { isLoadingLocalWallet, modal, wallet } = useWallet().state
  const enabledWalletAccountIds = useAppSelector(selectEnabledWalletAccountIds)
  const prevAccountIdsRef = useRef<string>('')

  const isLazyTxHistoryEnabled = useFeatureFlag('LazyTxHistory')

  useEffect(() => {
    if (!wallet) return

    console.log('[PERF] usePortfolioFetch: Clearing cache and resetting API state (wallet changed)')
    accountService.clearCache()
    dispatch(txHistoryApi.util.resetApiState())
  }, [dispatch, wallet])

  useEffect(() => {
    if (!wallet) return
    if (modal || isLoadingLocalWallet) return
    if (enabledWalletAccountIds.length === 0) return

    const accountIdsKey = [...enabledWalletAccountIds].sort().join(',')
    if (accountIdsKey === prevAccountIdsRef.current) return
    prevAccountIdsRef.current = accountIdsKey

    console.log(`[PERF] usePortfolioFetch: Loading ${enabledWalletAccountIds.length} accounts`, {
      accountIds: enabledWalletAccountIds,
      isLazyTxHistoryEnabled,
    })
    console.time('[PERF] usePortfolioFetch: accountService.loadAccounts')

    const { getAllTxHistory } = txHistoryApi.endpoints

    accountService.loadAccounts(enabledWalletAccountIds)

    console.timeEnd('[PERF] usePortfolioFetch: accountService.loadAccounts')

    if (isLazyTxHistoryEnabled) {
      console.log('[PERF] usePortfolioFetch: Skipping tx history (lazy mode enabled)')
      return
    }

    console.log(
      `[PERF] usePortfolioFetch: Fetching tx history for ${enabledWalletAccountIds.length} accounts`,
    )
    enabledWalletAccountIds.forEach(requestedAccountId => {
      dispatch(getAllTxHistory.initiate(requestedAccountId))
    })
  }, [
    dispatch,
    enabledWalletAccountIds,
    isLazyTxHistoryEnabled,
    isLoadingLocalWallet,
    modal,
    wallet,
  ])
}
