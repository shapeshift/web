import {
  Button, Image,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
} from '@chakra-ui/react'
import { ipcRenderer } from 'electron'
import React, { useState } from 'react'

import { Text } from 'components/Text'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'


export const InitializeModal = () => {
  const { keepkey } = useWallet()
  const [loading] = useState(false)
  const { initialize } = useModal()
  const { close, isOpen } = initialize

  const HandleInitNewSeed = async () => {
    close()
  }

  const HandleRestoreSeed = async () => {
    close()
  }

  const HandleReject = async () => {
    close()
  }

  // @ts-ignore
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        ipcRenderer.send('unlockWindow', {})
        ipcRenderer.send('onCloseModal', {})
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
          <Text translation={'modals.firmware.header'} />
        </ModalHeader>
        <ModalBody>
          <div>
            <Button
                isFullWidth
                size='lg'
                colorScheme='blue'
                onClick={HandleInitNewSeed}
                disabled={loading}
            >
              <Text translation={'modals.initialize.initialize'} />
            </Button>
            <Button
                isFullWidth
                size='lg'
                colorScheme='blue'
                onClick={HandleRestoreSeed}
                disabled={loading}
            >
              <Text translation={'modals.initialize.restore'} />
            </Button>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
