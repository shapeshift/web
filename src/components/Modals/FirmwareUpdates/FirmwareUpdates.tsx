import {
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
} from '@chakra-ui/react'
import { Text } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'

export const FirmwardUpdates = () => {
  const { hardwareError } = useModal()
  const { close, isOpen } = hardwareError

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
            </ModalHeader>
            <Text translation={'confirm bootloader update on device'} />
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
