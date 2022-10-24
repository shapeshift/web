import {
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
} from '@chakra-ui/react'
import { ipcRenderer } from 'electron'
import { Text } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'

export const UpdateFirmware = () => {
  const { updateFirmware } = useModal()
  const { close, isOpen } = updateFirmware

  const handleUpdateFirmware = async () => {
    ipcRenderer.send('@keepkey/update-firmware', {})
  }

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
              <Text translation='Firmware update required' />
            </ModalHeader>
            <Button onClick={handleUpdateFirmware}>
              <Text translation={'Confim on device'} />
            </Button>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
