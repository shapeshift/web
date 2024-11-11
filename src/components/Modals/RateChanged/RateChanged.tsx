import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import { useModal } from 'hooks/useModal/useModal'

export const RateChangedModal = () => {
  const rateChanged = useModal('rateChanged')
  const { close, isOpen } = rateChanged

  return (
    <Modal isOpen={isOpen} onClose={close} isCentered size='sm'>
      <ModalOverlay />
      <ModalContent>Rate changed - TODO @reallybeard oil</ModalContent>
    </Modal>
  )
}
