import {
  Alert,
  AlertDescription,
  AlertIcon,
  Button,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay
} from '@chakra-ui/react'
import React, { useRef, useState } from 'react'
import { Text } from 'components/Text'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'

export const PassphraseModal = ({ deviceId }: { deviceId: string }) => {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { keepkeyPassphrase } = useModal()
  const { close, isOpen } = keepkeyPassphrase
  const { state } = useWallet()
  const wallet = state.keyring.get(deviceId)

  const inputRef = useRef<HTMLInputElement | null>(null)

  const handleSubmit = async () => {
    setLoading(true)
    const passphrase = inputRef.current?.value
    try {
      // The event handler will pick up the response to the sendPin request
      await wallet?.sendPassphrase(passphrase ?? '')
      setError(null)
      return close()
    } catch (e) {
      setError('modals.keepKey.passphrase.error')
    }
    setLoading(false)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        wallet?.cancel().catch()
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
          <Text translation={`modals.keepKey.passphrase.header`} />
        </ModalHeader>
        <ModalBody>
          <Text color='gray.500' translation={`modals.keepKey.passphrase.body`} />
          <Input type='password' ref={inputRef} size='lg' variant='filled' mt={3} mb={6} />
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
            onClick={handleSubmit}
            disabled={loading}
          >
            <Text translation={`modals.keepKey.passphrase.button`} />
          </Button>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
