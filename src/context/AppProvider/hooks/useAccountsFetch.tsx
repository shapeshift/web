import { useEffect } from 'react'

import { useAccountsFetchQuery } from './useAccountsFetchQuery'

import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { portfolioApi } from '@/state/slices/portfolioSlice/portfolioSlice'
import { selectEnabledWalletAccountIds } from '@/state/slices/selectors'
import { txHistoryApi } from '@/state/slices/txHistorySlice/txHistorySlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

export const useAccountsFetch = () => {
  const dispatch = useAppDispatch()
  const { isLoadingLocalWallet, modal, wallet } = useWallet().state
  const enabledWalletAccountIds = useAppSelector(selectEnabledWalletAccountIds)

  const isLazyTxHistoryEnabled = useFeatureFlag('LazyTxHistory')

  useEffect(() => {
    if (!wallet) return

    dispatch(portfolioApi.util.resetApiState())
    dispatch(txHistoryApi.util.resetApiState())
  }, [dispatch, wallet])

  // Fetch portfolio for all managed accounts as a side-effect if they exist instead of going through the initial account detection flow.
  // This ensures that we have fresh portfolio data, but accounts added through account management are not accidentally blown away.
  useEffect(() => {
    // Do not fetch accounts if the wallet modal is open or we're reconciliating local wallet - user is either inputting password, switching accounts, or their wallet is being rehydrated
    if (modal || isLoadingLocalWallet) return

    const { getAllTxHistory } = txHistoryApi.endpoints

    enabledWalletAccountIds.forEach(accountId => {
      dispatch(portfolioApi.endpoints.getAccount.initiate({ accountId, upsertOnFetch: true }))
    })

    if (isLazyTxHistoryEnabled) return

    enabledWalletAccountIds.forEach(requestedAccountId => {
      dispatch(getAllTxHistory.initiate(requestedAccountId))
    })
  }, [isLoadingLocalWallet, modal, dispatch, enabledWalletAccountIds, isLazyTxHistoryEnabled])

  const query = useAccountsFetchQuery()
  return query
}
