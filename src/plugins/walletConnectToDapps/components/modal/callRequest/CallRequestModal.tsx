import { ModalContent } from '@chakra-ui/modal'
import {
  HStack,
  Modal,
  ModalCloseButton,
  ModalHeader,
  ModalOverlay,
  useToast,
} from '@chakra-ui/react'
import { convertHexToUtf8 } from '@walletconnect/utils'
import { useWalletConnect } from 'plugins/walletConnectToDapps/WalletConnectBridgeContext'
import { useCallback } from 'react'
import { useMemo } from 'react'
import { WalletConnectIcon } from 'components/Icons/WalletConnectIcon'
import { Text } from 'components/Text'

import { SendTransactionConfirmation } from './SendTransactionConfirmation'
import { SignMessageConfirmation } from './SignMessageConfirmation'

export const CallRequestModal = () => {
  const { bridge, requests, removeRequest } = useWalletConnect()
  const toast = useToast()

  const currentRequest = requests[0]

  const onConfirm = useCallback(
    async (txData: any) => {
      try {
        await bridge?.approve(requests[0], txData).then(() => removeRequest(currentRequest.id))
        removeRequest(currentRequest.id)
      } catch (e) {
        toast({
          title: 'Error',
          description: `Transaction error ${e}`,
          isClosable: true,
        })
      }
    },
    [bridge, currentRequest.id, removeRequest, requests, toast],
  )

  const onReject = useCallback(async () => {
    await bridge?.reject(currentRequest)
    removeRequest(currentRequest.id)
  }, [bridge, currentRequest, removeRequest])

  const content = useMemo(() => {
    switch (currentRequest.method) {
      case 'personal_sign':
        return (
          <SignMessageConfirmation
            message={convertHexToUtf8(currentRequest.params[0])}
            onConfirm={onConfirm}
            onReject={onReject}
          />
        )
      case 'eth_sendTransaction':
        return (
          <SendTransactionConfirmation
            request={currentRequest.params[0]}
            onConfirm={onConfirm}
            onReject={onReject}
          />
        )
      default:
        return null
    }
  }, [currentRequest, onConfirm, onReject])

  return (
    <Modal
      isOpen={!!currentRequest}
      onClose={() => bridge?.reject(currentRequest)}
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
