import { fromAccountId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { useQueries } from '@tanstack/react-query'
import { useEffect } from 'react'

import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { CHAIN_ID_TO_MORALIS_CHAIN, getMoralisAccountQueryFn } from '@/lib/moralis'
import { portfolioApi } from '@/state/slices/portfolioSlice/portfolioSlice'
import { selectEnabledWalletAccountIds } from '@/state/slices/selectors'
import { txHistoryApi } from '@/state/slices/txHistorySlice/txHistorySlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

export const usePortfolioFetch = () => {
  const dispatch = useAppDispatch()
  const { isLoadingLocalWallet, modal, wallet } = useWallet().state
  const enabledWalletAccountIds = useAppSelector(selectEnabledWalletAccountIds)

  // Keep a listener here to ensure we always rely on cached data and don't overfetch from Moralis
  // Though, we're only really using that data with `queryClient.fetchQuery()` in RTK endpoints
  useQueries({
    queries: enabledWalletAccountIds
      .filter(accountId => {
        const chainId = fromAccountId(accountId).chainId
        return isEvmChainId(chainId) && CHAIN_ID_TO_MORALIS_CHAIN[chainId]
      })
      .map(accountId => ({
        queryKey: ['moralisAccount', accountId],
        queryFn: getMoralisAccountQueryFn(accountId),
      })),
  })

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
  }, [dispatch, enabledWalletAccountIds, isLazyTxHistoryEnabled, isLoadingLocalWallet, modal])
}
