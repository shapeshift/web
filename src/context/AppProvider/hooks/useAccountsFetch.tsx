import { useEffect } from 'react'

import { useAccountsFetchQuery } from './useAccountsFetchQuery'

import { useWallet } from '@/hooks/useWallet/useWallet'
import { portfolioApi } from '@/state/slices/portfolioSlice/portfolioSlice'
import { selectEnabledWalletAccountIds } from '@/state/slices/selectors'
import { txHistoryApi } from '@/state/slices/txHistorySlice/txHistorySlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

export const useAccountsFetch = () => {
  const dispatch = useAppDispatch()
  const { wallet } = useWallet().state
  const enabledWalletAccountIds = useAppSelector(selectEnabledWalletAccountIds)

  useEffect(() => {
    if (!wallet) return

    dispatch(portfolioApi.util.resetApiState())
    dispatch(txHistoryApi.util.resetApiState())
  }, [dispatch, wallet])

  // Fetch portfolio for all managed accounts as a side-effect if they exist instead of going through the initial account detection flow.
  // This ensures that we have fresh portfolio data, but accounts added through account management are not accidentally blown away.
  useEffect(() => {
    const { getAllTxHistory } = txHistoryApi.endpoints

    enabledWalletAccountIds.forEach(accountId => {
      dispatch(portfolioApi.endpoints.getAccount.initiate({ accountId, upsertOnFetch: true }))
    })

    enabledWalletAccountIds.forEach(requestedAccountId => {
      dispatch(getAllTxHistory.initiate(requestedAccountId))
    })
  }, [dispatch, enabledWalletAccountIds])

  const query = useAccountsFetchQuery()
  return query
}
