import { useEffect, useRef } from 'react'

import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { portfolioApi } from '@/state/slices/portfolioSlice/portfolioSlice'
import { selectEnabledWalletAccountIds } from '@/state/slices/selectors'
import { txHistoryApi } from '@/state/slices/txHistorySlice/txHistorySlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

export const usePortfolioFetch = () => {
  const dispatch = useAppDispatch()
  const { isLoadingLocalWallet, modal, wallet } = useWallet().state
  const enabledWalletAccountIds = useAppSelector(selectEnabledWalletAccountIds)
  const prevAccountIdsRef = useRef<string>('')

  const isLazyTxHistoryEnabled = useFeatureFlag('LazyTxHistory')
  const isGraphQLAccountDataEnabled = useFeatureFlag('GraphQLAccountData')

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
    if (enabledWalletAccountIds.length === 0) return

    // Avoid refetching if account IDs haven't changed
    const accountIdsKey = enabledWalletAccountIds.join(',')
    if (accountIdsKey === prevAccountIdsRef.current) return
    prevAccountIdsRef.current = accountIdsKey

    const { getAllTxHistory } = txHistoryApi.endpoints

    // Use batch endpoint for GraphQL, individual endpoints for legacy
    if (isGraphQLAccountDataEnabled) {
      dispatch(
        portfolioApi.endpoints.getAccountsBatch.initiate({ accountIds: enabledWalletAccountIds }),
      )
    } else {
      enabledWalletAccountIds.forEach(accountId => {
        dispatch(portfolioApi.endpoints.getAccount.initiate({ accountId, upsertOnFetch: true }))
      })
    }

    if (isLazyTxHistoryEnabled) return

    enabledWalletAccountIds.forEach(requestedAccountId => {
      dispatch(getAllTxHistory.initiate(requestedAccountId))
    })
  }, [
    dispatch,
    enabledWalletAccountIds,
    isGraphQLAccountDataEnabled,
    isLazyTxHistoryEnabled,
    isLoadingLocalWallet,
    modal,
  ])
}
