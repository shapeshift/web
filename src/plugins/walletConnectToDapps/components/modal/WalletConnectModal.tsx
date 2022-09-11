import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/modal'
import { HStack, ModalCloseButton, ModalHeader } from '@chakra-ui/react'
import type { FC } from 'react'
import React from 'react'
import { WalletConnectIcon } from 'components/Icons/WalletConnectIcon'
import { Text } from 'components/Text'

import { SignMessageConfirmation } from './SignMessageConfirmation'

type WalletConnectModalProps = {
  isOpen: boolean
  children: React.ReactNode
  onClose(): void
}

export const WalletConnectModal: FC<WalletConnectModalProps> = ({ isOpen, onClose }) => {
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
            <Text
              rounded='lg'
              fontSize='sm'
              px='2'
              bgColor='purple.600'
              translation='plugins.walletConnectToDapps.modal.ethereum'
            />
            <ModalCloseButton position='static' />
          </HStack>
        </ModalHeader>
        <SignMessageConfirmation
          message='Message to sign...'
          isLoading={false}
          dapp={{
            name: 'Rainbow',
            image:
              'https://rawcdn.githack.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
            url: 'https://dework.xyz',
          }}
        />
      </ModalContent>
    </Modal>
  )
}
