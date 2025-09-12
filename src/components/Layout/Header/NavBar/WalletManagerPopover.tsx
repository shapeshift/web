import { Box } from '@chakra-ui/react'
import type { FC } from 'react'
import { memo, useCallback } from 'react'

import { useDrawerWalletContext } from './DrawerWalletContext'
import { WalletButton } from './WalletButton'

import { DrawerWallet } from '@/components/Layout/Header/NavBar/DrawerWallet'
import { WalletActions } from '@/context/WalletProvider/actions'
import { useWallet } from '@/hooks/useWallet/useWallet'

export const WalletManagerPopover: FC = memo(() => {
  const {
    state: { isConnected, walletInfo, isLocked, isLoadingLocalWallet },
    dispatch,
  } = useWallet()

  const { isDrawerOpen, openDrawer, closeDrawer } = useDrawerWalletContext()

  const handleConnect = useCallback(() => {
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  }, [dispatch])

  const handleOpen = useCallback(() => {
    if (!isConnected) return
    if (isDrawerOpen) {
      closeDrawer()
    } else {
      openDrawer()
    }
  }, [isConnected, isDrawerOpen, openDrawer, closeDrawer])

  return (
    <>
      <Box>
        <WalletButton
          onConnect={handleConnect}
          walletInfo={walletInfo}
          isConnected={isConnected && !isLocked}
          isLoadingLocalWallet={isLoadingLocalWallet}
          onClick={isConnected && !isLocked ? handleOpen : handleConnect}
          data-test='navigation-wallet-dropdown-button'
        />
      </Box>
      <DrawerWallet />
    </>
  )
})
