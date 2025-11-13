import { useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'

import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useModal } from '@/hooks/useModal/useModal'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { selectWalletType } from '@/state/slices/localWalletSlice/selectors'
import { selectIsPortfolioLoading, selectPortfolioAccounts } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export const useAddAccountsGuard = () => {
  const {
    state: { wallet, isConnected, deviceId },
  } = useWallet()
  const portfolioAccounts = useSelector(selectPortfolioAccounts)
  const isPortfolioLoading = useSelector(selectIsPortfolioLoading)
  const walletType = useAppSelector(selectWalletType)
  const manageAccountsModal = useModal('manageAccounts')
  const hasCheckedRef = useRef(false)
  const prevDeviceIdRef = useRef<string | null>(null)

  // Reset the hasChecked flag when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      hasCheckedRef.current = false
    }
  }, [isConnected])

  // Reset the hasChecked flag when wallet deviceId changes
  useEffect(() => {
    if (deviceId !== prevDeviceIdRef.current) {
      hasCheckedRef.current = false
      prevDeviceIdRef.current = deviceId
    }
  }, [deviceId])

  useEffect(() => {
    if (!isConnected || !wallet || hasCheckedRef.current) return

    if (walletType !== KeyManager.Ledger && walletType !== KeyManager.Trezor) return

    // Only open if we don't already have accounts connected
    const accountIds = Object.keys(portfolioAccounts)
    if (accountIds.length === 0) {
      hasCheckedRef.current = true
      manageAccountsModal.open({})
    }
  }, [isConnected, wallet, walletType, portfolioAccounts, isPortfolioLoading, manageAccountsModal])
}
