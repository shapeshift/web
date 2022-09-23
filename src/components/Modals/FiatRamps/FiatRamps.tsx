import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/modal'
import { useModal } from 'hooks/useModal/useModal'

import { FiatRampsRouter } from './FiatRampsRouter'

export const FiatRampsModal = () => {
  const { fiatRamps } = useModal()
  const { close, isOpen } = fiatRamps

  return (
    <Modal isOpen={isOpen} onClose={close} isCentered variant='fluid'>
      <ModalOverlay />

      <ModalContent
        width='full'
        borderRadius={{ base: 0, md: 'xl' }}
        minWidth={{ base: '100%', md: '500px' }}
        maxWidth={{ base: 'full', md: '500px' }}
      >
        <FiatRampsRouter />
      </ModalContent>
    </Modal>
  )
}
