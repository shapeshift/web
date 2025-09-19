import type { FC } from 'react'
import { memo, useCallback } from 'react'

import { UserMenu } from './UserMenu'
import { WalletButton } from './WalletButton'

import { useModal } from '@/hooks/useModal/useModal'
import { useWallet } from '@/hooks/useWallet/useWallet'

export const WalletManagerDrawer: FC = memo(() => {
  const {
    state: { isConnected, walletInfo, isLocked, isLoadingLocalWallet },
  } = useWallet()

  const walletDrawer = useModal('walletDrawer')

  const handleOpen = useCallback(() => {
    if (!isConnected) return
    walletDrawer.open({})
  }, [isConnected, walletDrawer])

  const handleConnect = useCallback(() => {
    // Empty function - not used when connected
  }, [])

  // If not connected or locked, fall back to the old UserMenu completely
  if (!isConnected || isLocked) {
    return <UserMenu />
  }

  // For connected state, use the new wallet drawer behavior
  return (
    <WalletButton
      onConnect={handleConnect}
      walletInfo={walletInfo}
      isConnected={isConnected && !isLocked}
      isLoadingLocalWallet={isLoadingLocalWallet}
      onClick={isConnected && !isLocked ? handleOpen : undefined}
      data-test='navigation-wallet-dropdown-button'
    />
  )
})
