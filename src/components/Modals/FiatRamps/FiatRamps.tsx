import { ArrowBackIcon } from '@chakra-ui/icons'
import { Modal, ModalCloseButton, ModalContent, ModalOverlay } from '@chakra-ui/modal'
import { IconButton, ModalHeader } from '@chakra-ui/react'
import { title } from 'process'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { useHistory } from 'react-router-dom'
import { RawText } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'

import { FiatRampsRoutes } from './FiatRampsCommon'
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
