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
import { Event } from '@shapeshiftoss/hdwallet-core'
import React, { useEffect, useRef, useState } from 'react'
import { Text } from 'components/Text'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { MessageType } from 'context/WalletProvider/KeepKey/KeepKeyTypes'
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

  useEffect(() => {
    /**
     * Handle errors reported by the KeepKey
     * Specifically look for PIN errors that are relevant to this modal
     */
    const handleEvent = (e: Event) => {
      setLoading(false)
      if (e.message_enum === MessageType.FAILURE) {
        setError('modals.keepKey.errors.unknown')
      }
    }

    state.keyring.on(['KeepKey', deviceId, String(MessageType.FAILURE)], handleEvent)

    return () => {
      state.keyring.off(['KeepKey', deviceId, String(MessageType.FAILURE)], handleEvent)
    }
  }, [deviceId, state.keyring])

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
          <Input type='password' ref={inputRef} size='lg' variant='filled' mb={6} />
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
