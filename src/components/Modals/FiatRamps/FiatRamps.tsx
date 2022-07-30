import { Modal, ModalCloseButton, ModalContent, ModalOverlay } from '@chakra-ui/modal'
import { MemoryRouter } from 'react-router-dom'
import { useModal } from 'hooks/useModal/useModal'

import { FiatRampsRoutes } from './FiatRampsCommon'
import { FiatRampsRouter } from './FiatRampsRouter'

import { useHistory } from 'react-router-dom'
import { IconButton, ModalHeader } from '@chakra-ui/react'
import { ArrowBackIcon } from '@chakra-ui/icons'


const entries = [FiatRampsRoutes.Select, FiatRampsRoutes.Manager]


const FiatRampsContent = () => {
  const history = useHistory()
  return (
    <>
      <ModalHeader>
        <IconButton 
          variant="ghost"
          icon={<ArrowBackIcon />}
          onClick={() => {
            history.goBack()
          }}
          size="sm"
          aria-label='Back'
          position={'absolute'}
          top={2}
          left={3}
          fontSize='xl'
          isRound
        />
    
        <ModalCloseButton />

      </ModalHeader>

      <FiatRampsRouter />
    </>
  )
}

export const FiatRampsModal = () => {
  const { fiatRamps } = useModal()
  const { close, isOpen } = fiatRamps


  return (
      <Modal isOpen={isOpen} onClose={close} isCentered variant='fluid'>
        <ModalOverlay />
        <MemoryRouter initialEntries={entries}>

          <ModalContent>
            <FiatRampsContent />
          </ModalContent>
        </MemoryRouter>

      </Modal>

  )
}
