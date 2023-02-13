import { Modal, ModalCloseButton, ModalContent, ModalOverlay } from '@chakra-ui/react'
import { fromAccountId } from '@shapeshiftoss/caip'
import { ConnectContent } from 'plugins/walletConnectToDapps/v1/components/modals/connect/ConnectContent'
import { useWalletConnect } from 'plugins/walletConnectToDapps/v1/WalletConnectBridgeContext'
import { useCallback } from 'react'

type Props = {
  isOpen: boolean
  onClose(): void
}

const Connect = ({ isOpen, onClose }: Props) => {
  const { connect, wcAccountId } = useWalletConnect()
  const handleConnect = useCallback(
    (uri: string) => {
      if (!wcAccountId) return
      const connectionResult = connect(uri, fromAccountId(wcAccountId).account)
      if (connectionResult?.successful) onClose()
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
        <ConnectContent handleConnect={handleConnect} />
      </ModalContent>
    </Modal>
  )
}

export const ConnectModal = Connect
