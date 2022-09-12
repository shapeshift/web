import { ArrowBackIcon } from '@chakra-ui/icons'
import { Modal, ModalCloseButton, ModalContent, ModalOverlay } from '@chakra-ui/modal'
import { IconButton, ModalHeader } from '@chakra-ui/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { useHistory } from 'react-router-dom'
import { useModal } from 'hooks/useModal/useModal'

import { FiatRampsRoutes } from './FiatRampsCommon'
import { FiatRampsRouter } from './FiatRampsRouter'

const entries = [FiatRampsRoutes.Select, FiatRampsRoutes.Manager]

const FiatRampsContent = () => {
  const { goBack: handleBackClick } = useHistory()
  const location = useLocation()

  if (location.pathname === FiatRampsRoutes.Select) {
    return (
      <>
        <ModalCloseButton />
        <FiatRampsRouter />
      </>
    )
  }

  return (
    <>
      <ModalHeader>
        <IconButton
          variant='ghost'
          icon={<ArrowBackIcon />}
          onClick={handleBackClick}
          size='sm'
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
        <ModalContent
          width='full'
          borderRadius={{ base: 0, md: 'xl' }}
          minWidth={{ base: '100%', md: '500px' }}
          maxWidth={{ base: 'full', md: '500px' }}
        >
          <FiatRampsContent />
        </ModalContent>
      </MemoryRouter>
    </Modal>
  )
}
