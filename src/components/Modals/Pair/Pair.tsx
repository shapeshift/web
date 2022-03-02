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
  ModalOverlay,
  Stack
} from '@chakra-ui/react'
import { ipcRenderer } from 'electron'
import { useState } from 'react'
import { Text } from 'components/Text'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { SlideTransition } from 'components/SlideTransition'


export type PairingProps = {
  appname: string,
  publicKey: string
}

export const PairModal = (input: PairingProps) => {
  const [error] = useState<string | null>(null)
  const [loading] = useState(false)
  const { pair } = useModal()
  const { close, isOpen } = pair

  const HandleSubmit = async () => {
    ipcRenderer.send('@bridge/approve-origin', input)
    close()
  }

  const HandleReject = async () => {
    ipcRenderer.send('@bridge/reject-origin', input)
    close()
  }

  return (
    <SlideTransition>
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
            <Stack spacing={4} mb={4}>
              <Text translation={['modals.pair.body', { appname: input.appname }]} />
              {error && (
                <Alert status='error'>
                  <AlertIcon />
                  <AlertDescription>
                    <Text translation={error} />
                  </AlertDescription>
                </Alert>
              )}
              <Button
                width='full'
                size='lg'
                colorScheme='blue'
                onClick={HandleSubmit}
                disabled={loading}
              >
                <Text translation={'modals.pair.cta.pair'} />
              </Button>
              <Button
                width='full'
                size='lg'
                colorScheme='red'
                onClick={HandleReject}
                disabled={loading}
              >
                <Text translation={'modals.pair.cta.reject'} />
              </Button>
            </Stack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </SlideTransition>
  )
}
