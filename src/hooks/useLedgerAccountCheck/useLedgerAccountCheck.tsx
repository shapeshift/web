import { useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'

import { useModal } from '@/hooks/useModal/useModal'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { selectIsPortfolioLoading, selectPortfolioAccounts } from '@/state/slices/selectors'

export const useLedgerAccountCheck = () => {
  const {
    state: { wallet, isConnected },
  } = useWallet()
  const portfolioAccounts = useSelector(selectPortfolioAccounts)
  const isPortfolioLoading = useSelector(selectIsPortfolioLoading)
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

    const isLedger = wallet.getVendor() === 'Ledger'
    if (!isLedger) return

    // Only open if we don't already have accounts connected
    const accountIds = Object.keys(portfolioAccounts)
    if (accountIds.length === 0) {
      hasCheckedRef.current = true
      manageAccountsModal.open({})
    }
  }, [isConnected, wallet, portfolioAccounts, isPortfolioLoading, manageAccountsModal])
}
