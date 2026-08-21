import type { FC } from 'react'
import { memo, useCallback } from 'react'

import { WalletButton } from './WalletButton'

import { WalletActions } from '@/context/WalletProvider/actions'
import { useModal } from '@/hooks/useModal/useModal'
import { useWallet } from '@/hooks/useWallet/useWallet'

type WalletManagerDrawerProps = {
  onClick?: () => void
}

export const WalletManagerDrawer: FC<WalletManagerDrawerProps> = memo(({ onClick }) => {
  const {
    state: { isConnected, walletInfo, isLocked, isLoadingLocalWallet },
    dispatch,
  } = useWallet()

  const walletDrawer = useModal('walletDrawer')

  const handleConnect = useCallback(() => {
    onClick?.()
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  }, [dispatch, onClick])

  // A locked wallet still opens the drawer, or disconnecting would mean unlocking first
  const handleOpen = useCallback(() => {
    if (!walletInfo?.deviceId) return

    onClick?.()
    walletDrawer.open({})
  }, [onClick, walletInfo?.deviceId, walletDrawer])

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
