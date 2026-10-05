import { fromAccountId } from '@shapeshiftoss/caip'
import { useEffect } from 'react'

import { chainScansKnownTokens, useAssetService } from '@/hooks/useAssetService/useAssetService'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { assets } from '@/state/slices/assetsSlice/assetsSlice'
import { portfolioApi } from '@/state/slices/portfolioSlice/portfolioSlice'
import { selectEnabledWalletAccountIds } from '@/state/slices/selectors'
import { txHistoryApi } from '@/state/slices/txHistorySlice/txHistorySlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

export const usePortfolioFetch = () => {
  const dispatch = useAppDispatch()
  const { isLoadingLocalWallet, modal, wallet } = useWallet().state
  const enabledWalletAccountIds = useAppSelector(selectEnabledWalletAccountIds)
  const { isPending: isAssetServicePending } = useAssetService()
  const hasGeneratedAssets = useAppSelector(assets.selectors.selectHasGeneratedAssets)

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
      if (isAssetServicePending) {
        // Placeholders for unknown tokens are built from the assets in the store, so wait for them on a first load
        if (!hasGeneratedAssets) return
        // RTK Query keeps the first result of a subscribed query, so this would pin empty balances
        if (chainScansKnownTokens(fromAccountId(accountId).chainId)) return
      }

      dispatch(portfolioApi.endpoints.getAccount.initiate({ accountId, upsertOnFetch: true }))
    })

    if (isLazyTxHistoryEnabled) return

    enabledWalletAccountIds.forEach(requestedAccountId => {
      dispatch(getAllTxHistory.initiate(requestedAccountId))
    })
  }, [
    dispatch,
    enabledWalletAccountIds,
    hasGeneratedAssets,
    isAssetServicePending,
    isLazyTxHistoryEnabled,
    isLoadingLocalWallet,
    modal,
  ])
}
