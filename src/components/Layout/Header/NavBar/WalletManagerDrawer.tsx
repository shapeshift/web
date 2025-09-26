import type { FC } from 'react'
import { memo, useCallback } from 'react'

import { UserMenu } from './UserMenu'
import { WalletButton } from './WalletButton'

import { WalletActions } from '@/context/WalletProvider/actions'
import { useModal } from '@/hooks/useModal/useModal'
import { useWallet } from '@/hooks/useWallet/useWallet'

export const WalletManagerDrawer: FC = memo(() => {
  const {
    state: { isConnected, walletInfo, isLocked, isLoadingLocalWallet },
    dispatch,
  } = useWallet()

  const walletDrawer = useModal('walletDrawer')

  const handleConnect = useCallback(() => {
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  }, [dispatch])

  const handleOpen = useCallback(() => {
    if (!isConnected) return
    walletDrawer.open({})
  }, [isConnected, walletDrawer])

  // If not connected or locked, fall back to the old UserMenu completely
  if (!isConnected || isLocked) {
    return <UserMenu />
  }

  return (
    <WalletButton
      onConnect={handleConnect}
      walletInfo={walletInfo}
      isConnected={isConnected && !isLocked}
      isLoadingLocalWallet={isLoadingLocalWallet}
      onClick={handleOpen}
      data-test='navigation-wallet-dropdown-button'
    />
  )
})
