import { Box, Popover, PopoverBody, PopoverContent, PopoverTrigger } from '@chakra-ui/react'
import type { FC } from 'react'
import { memo, useCallback, useState } from 'react'

import { WalletButton } from './WalletButton'

import { PopoverWallet } from '@/components/Layout/Header/NavBar/PopoverWallet'
import { WalletActions } from '@/context/WalletProvider/actions'
import { useWallet } from '@/hooks/useWallet/useWallet'

export const WalletManagerPopover: FC = memo(() => {
  const {
    state: { isConnected, walletInfo, isLocked, isLoadingLocalWallet },
    dispatch,
  } = useWallet()

  const handleConnect = useCallback(() => {
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  }, [dispatch])

  const [isOpen, setIsOpen] = useState(false)

  const handleOpen = useCallback(() => {
    if (!isConnected) return
    setIsOpen(!isOpen)
  }, [isConnected, isOpen])

  const handleClose = useCallback(() => setIsOpen(false), [])

  return (
    <Popover isOpen={isOpen} onOpen={handleOpen} onClose={handleClose} placement='bottom-end'>
      <PopoverTrigger>
        <Box>
          <WalletButton
            onConnect={handleConnect}
            walletInfo={walletInfo}
            isConnected={isConnected && !isLocked}
            isLoadingLocalWallet={isLoadingLocalWallet}
            data-test='navigation-wallet-dropdown-button'
          />
        </Box>
      </PopoverTrigger>
      <PopoverContent width='430px' bg={'background.surface.base'} p={0}>
        <PopoverBody p={4} width='430px'>
          <PopoverWallet onClose={handleClose} />
        </PopoverBody>
      </PopoverContent>
    </Popover>
  )
})
