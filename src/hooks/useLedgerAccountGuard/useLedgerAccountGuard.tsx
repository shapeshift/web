import { useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'

import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useModal } from '@/hooks/useModal/useModal'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { selectWalletType } from '@/state/slices/localWalletSlice/selectors'
import { selectIsPortfolioLoading, selectPortfolioAccounts } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export const useLedgerAccountGuard = () => {
  const {
    state: { wallet, isConnected },
  } = useWallet()
  const portfolioAccounts = useSelector(selectPortfolioAccounts)
  const isPortfolioLoading = useSelector(selectIsPortfolioLoading)
  const walletType = useAppSelector(selectWalletType)
  const manageAccountsModal = useModal('manageAccounts')
  const hasCheckedRef = useRef(false)

  // Reset the hasChecked flag when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      hasCheckedRef.current = false
    }
  }, [isConnected])

  useEffect(() => {
    if (!isConnected || !wallet || hasCheckedRef.current) return

    if (walletType !== KeyManager.Ledger && walletType !== KeyManager.GridPlus) return

    // Only open if we don't already have accounts connected
    const accountIds = Object.keys(portfolioAccounts)
    if (accountIds.length === 0) {
      hasCheckedRef.current = true
      manageAccountsModal.open({})
    }
  }, [isConnected, wallet, walletType, portfolioAccounts, isPortfolioLoading, manageAccountsModal])
}
