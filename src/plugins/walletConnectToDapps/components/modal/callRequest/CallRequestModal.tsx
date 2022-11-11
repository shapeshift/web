import { ModalContent } from '@chakra-ui/modal'
import { HStack, Modal, ModalCloseButton, ModalHeader, ModalOverlay } from '@chakra-ui/react'
import { useWalletConnect } from 'plugins/walletConnectToDapps/WalletConnectBridgeContext'
import { WalletConnectIcon } from 'components/Icons/WalletConnectIcon'
import { Text } from 'components/Text'

import { SendTransactionConfirmation } from './SendTransactionConfirmation'
import { SignMessageConfirmation } from './SignMessageConfirmation'

export const CallRequestModal = () => {
  const { bridge, requests } = useWalletConnect()
  const currentRequest = requests[0] as any

  return (
    <Modal
      isOpen={!!currentRequest}
      onClose={() =>
        bridge?.connector.rejectRequest({
          id: currentRequest.id,
          error: { message: 'Rejected by user' },
        })
      }
      variant='header-nav'
    >
      <ModalOverlay />
      <ModalContent
        width='full'
        borderRadius={{ base: 0, md: 'xl' }}
        minWidth={{ base: '100%', md: '500px' }}
        maxWidth={{ base: 'full', md: '500px' }}
      >
        <ModalHeader py={2}>
          <HStack alignItems='center' spacing={2}>
            <WalletConnectIcon />
            <Text fontSize='md' translation='plugins.walletConnectToDapps.modal.title' flex={1} />
            <Text rounded='lg' fontSize='sm' px='2' bgColor='purple.600' translation='ethereum' />
            <ModalCloseButton position='static' />
          </HStack>
        </ModalHeader>
        {currentRequest.method === 'personal_sign' ? (
          <SignMessageConfirmation />
        ) : (
          <SendTransactionConfirmation />
        )}
      </ModalContent>
    </Modal>
  )
}
