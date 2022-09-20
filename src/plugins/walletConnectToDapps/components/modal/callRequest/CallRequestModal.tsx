import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/modal'
import { HStack, ModalCloseButton, ModalHeader } from '@chakra-ui/react'
import type { WalletConnectCallRequest } from '@shapeshiftoss/hdwallet-walletconnect-bridge/dist/types'
import { convertHexToUtf8 } from '@walletconnect/utils'
import { useWalletConnect } from 'plugins/walletConnectToDapps/WalletConnectBridgeContext'
import type { FC } from 'react'
import { useMemo } from 'react'
import { WalletConnectIcon } from 'components/Icons/WalletConnectIcon'
import { Text } from 'components/Text'

import { SignMessageConfirmation } from './SignMessageConfirmation'

type WalletConnectModalProps = {
  callRequest: WalletConnectCallRequest | undefined
}

export const CallRequestModal: FC<WalletConnectModalProps> = ({ callRequest }) => {
  const { approveRequest, rejectRequest } = useWalletConnect()

  const content = useMemo(() => {
    if (!callRequest) return null
    switch (callRequest.method) {
      case 'personal_sign':
        return (
          <SignMessageConfirmation
            message={convertHexToUtf8(callRequest.params[0])}
            isLoading={false}
            onConfirm={() => approveRequest(callRequest)}
            onReject={() => rejectRequest(callRequest)}
          />
        )
      default:
        return null
    }
  }, [callRequest, approveRequest, rejectRequest])

  return (
    <Modal isOpen={!!callRequest} onClose={() => alert('allow close?')} variant='header-nav'>
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
        {content}
      </ModalContent>
    </Modal>
  )
}
