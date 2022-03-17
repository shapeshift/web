import {
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay
} from '@chakra-ui/react'
import { ipcRenderer } from 'electron'
import { Text } from 'components/Text'
import { useModal } from 'context/ModalProvider/ModalProvider'

export const HardwareErrorModal = () => {
  const { hardwareError } = useModal()
  const { close, isOpen } = hardwareError

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        ipcRenderer.send('unlockWindow', {})
        ipcRenderer.send('@modal/close', {})
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
          <Text translation={'modals.hardware.header'} />
        </ModalHeader>
        <ModalBody>
          <div>
            <Text translation={'modals.hardware.reconnect'} />
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
