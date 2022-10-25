import {
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
} from '@chakra-ui/react'
import { ipcRenderer } from 'electron'
import { useEffect } from 'react'
import { Text } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'

export const UpdateBootloader = () => {
  const { updateBootloader } = useModal()
  const { close, isOpen } = updateBootloader

  const handleUpdateBootloader = async () => {
    ipcRenderer.send('@keepkey/update-bootloader', {})
  }

  useEffect(() => {
    if (isOpen) {
      handleUpdateBootloader()
    }
  }, [isOpen])

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        close()
      }}
      isCentered
      closeOnOverlayClick={false}
      closeOnEsc={false}
    >
      <ModalOverlay />
      <ModalContent justifyContent='center' px={3} pt={3} pb={6}>
        <ModalCloseButton ml='auto' borderRadius='full' position='static' />
        <ModalBody>
          <div>
            <ModalHeader>
              <Text translation='Bootloader update required' />
              <Text translation='Click on device' />
            </ModalHeader>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
