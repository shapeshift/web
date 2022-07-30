import { Modal, ModalCloseButton, ModalContent, ModalOverlay } from '@chakra-ui/modal'
import { MemoryRouter } from 'react-router-dom'
import { useModal } from 'hooks/useModal/useModal'

import { FiatRampsRoutes } from './FiatRampsCommon'
import { FiatRampsRouter } from './FiatRampsRouter'

import { useHistory } from 'react-router-dom'
import { IconButton } from '@chakra-ui/react'
import { ArrowBackIcon } from '@chakra-ui/icons'


const entries = [FiatRampsRoutes.Select, FiatRampsRoutes.Manager]


const FiatRampsContent = () => {
  const history = useHistory()
  return (
    <>
      <ModalCloseButton />
      <IconButton 
        variant="ghost"
        icon={<ArrowBackIcon />}
        onClick={() => {
          history.goBack()
        }}
        size="sm"
        aria-label='Back'
      />
      <FiatRampsRouter />
    </>
  )
}

export const FiatRampsModal = () => {
  const { fiatRamps } = useModal()
  const { close, isOpen } = fiatRamps


  return (
    <MemoryRouter initialEntries={entries}>
      <Modal isOpen={isOpen} onClose={close} isCentered variant='fluid'>
        <ModalOverlay />
        <ModalContent>
          <FiatRampsContent />
        </ModalContent>
      </Modal>
    </MemoryRouter>

  )
}
