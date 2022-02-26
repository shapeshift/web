import {
  Alert,
  AlertDescription,
  AlertIcon,
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay
} from '@chakra-ui/react'
import { ipcRenderer } from 'electron'
import React, { useState } from 'react'
import { Text } from 'components/Text'
import { useModal } from 'context/ModalProvider/ModalProvider'

export const PairModal = (input: any) => {
  const [error] = useState<string | null>(null)
  const [loading] = useState(false)
  const { pair } = useModal()
  const { close, isOpen } = pair

  const HandleSubmit = async () => {
    ipcRenderer.send('onApproveOrigin', input)
    close()
  }

  const HandleReject = async () => {
    ipcRenderer.send('onRejectOrigin', input)
    close()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        ipcRenderer.send('unlockWindow', {})
        close()
      }}
      isCentered
      closeOnOverlayClick={false}
      closeOnEsc={false}
    >
      <ModalOverlay />
      <ModalContent justifyContent='center' px={3} pt={3} pb={6}>
        <ModalCloseButton ml='auto' borderRadius='full' position='static' />
        <ModalHeader>
          <Text translation={'modals.pair.header'} />
        </ModalHeader>
        <ModalBody>
          <Text color='gray.500' translation={'modals.pair.body'} />
          <div>{JSON.stringify(input)}</div>
          {error && (
            <Alert status='error'>
              <AlertIcon />
              <AlertDescription>
                <Text translation={error} />
              </AlertDescription>
            </Alert>
          )}
          <Button
            isFullWidth
            size='lg'
            colorScheme='blue'
            onClick={HandleSubmit}
            disabled={loading}
          >
            <Text translation={'modals.pair.pair'} />
          </Button>
          <br />
          <Button size='sm' colorScheme='red' onClick={HandleReject}>
            <Text translation={'modals.pair.reject'} />
          </Button>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
