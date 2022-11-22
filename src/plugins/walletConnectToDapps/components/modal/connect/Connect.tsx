import { Modal, ModalCloseButton, ModalContent, ModalOverlay } from '@chakra-ui/react'
import { fromAccountId } from '@shapeshiftoss/caip'
import { useWalletConnect } from 'plugins/walletConnectToDapps/WalletConnectBridgeContext'
import { useCallback } from 'react'

import { ConnectContent } from './ConnectContent'

type Props = {
  isOpen: boolean
  onClose(): void
}

const Connect = ({ isOpen, onClose }: Props) => {
  const { connect, wcAccountId } = useWalletConnect()
  const handleConnect = useCallback(
    (uri: string) => {
      if (!wcAccountId) return
      connect(uri, fromAccountId(wcAccountId).account)
      onClose()
    },
    [connect, onClose, wcAccountId],
  )
  return (
    <Modal isOpen={isOpen} onClose={onClose} variant='header-nav'>
      <ModalOverlay />
      <ModalContent
        width='full'
        textAlign='center'
        p={0}
        borderRadius={{ base: 0, md: 'xl' }}
        minWidth={{ base: '100%', md: '500px' }}
        maxWidth={{ base: 'full', md: '500px' }}
      >
        <ModalCloseButton position='absolute' color='gray.500' />
        <ConnectContent handleConnect={handleConnect} accountId={wcAccountId} />
      </ModalContent>
    </Modal>
  )
}

export const ConnectModal = Connect
