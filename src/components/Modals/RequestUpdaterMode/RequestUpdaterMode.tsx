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

export const RequestUpdaterMode = () => {
  const { requestUpdaterMode } = useModal()
  const { close, isOpen } = requestUpdaterMode

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
              <Text translation='Restart KeepKey in update mode' />
            </ModalHeader>
            <Text translation={'Restart device holding down button'} />
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
