import { Modal, ModalCloseButton, ModalContent, ModalOverlay } from '@chakra-ui/modal'
import { MemoryRouter } from 'react-router-dom'
import { useModal } from 'hooks/useModal/useModal'

import { FiatRampsRoutes } from './FiatRampsCommon'
import { FiatRampsRouter } from './FiatRampsRouter'

const entries = [FiatRampsRoutes.Select, FiatRampsRoutes.Manager]

export const FiatRampsModal = () => {
  const { fiatRamps } = useModal()
  const { close, isOpen } = fiatRamps
  return (
    <Modal isOpen={isOpen} onClose={close} isCentered variant='fluid'>
      <ModalOverlay />
      <ModalContent>
        <ModalCloseButton />
        <MemoryRouter initialEntries={entries}>
          <FiatRampsRouter />
        </MemoryRouter>
      </ModalContent>
    </Modal>
  )
}
