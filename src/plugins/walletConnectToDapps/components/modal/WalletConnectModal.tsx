import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/modal'
import { HStack, ModalCloseButton, ModalHeader } from '@chakra-ui/react'
import { WalletConnectIcon } from 'components/Icons/WalletConnectIcon'
import { Text } from 'components/Text'
import React, { FC } from 'react'

type EarnModalProps = {
  isOpen: boolean
  children: React.ReactNode
  onClose(): void
}

/**
 * Earn modal is linked to the router. When closed we return to the previous/background route
 */
export const WalletConnectModal: FC<EarnModalProps> = ({ children, isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} variant='header-nav'>
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
            <ModalCloseButton position='static' />
          </HStack>
        </ModalHeader>
        {children}
      </ModalContent>
    </Modal>
  )
}
