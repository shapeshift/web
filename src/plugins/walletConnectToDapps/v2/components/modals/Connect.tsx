import { Modal, ModalCloseButton, ModalContent, ModalOverlay } from '@chakra-ui/react'
import { ConnectContent } from 'plugins/walletConnectToDapps/v2/components/modals/ConnectContent'
import { useWalletConnectV2 } from 'plugins/walletConnectToDapps/v2/WalletConnectV2Provider'
import { useCallback } from 'react'

type Props = {
  isOpen: boolean
  onClose(): void
}

const Connect = ({ isOpen, onClose }: Props) => {
  const { pair } = useWalletConnectV2()
  const handleConnect = useCallback(
    async (uri: string) => {
      const connectionResult = await pair?.({ uri })
      if (connectionResult) onClose()
    },
    [onClose, pair],
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
