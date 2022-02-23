import { Modal, ModalCloseButton, ModalContent, ModalOverlay } from '@chakra-ui/modal'
import React from 'react'
import { useHistory } from 'react-router-dom'

export const BuySellModal: React.FC = ({ children }) => {
  const history = useHistory()
  return (
    <Modal isOpen onClose={history.goBack} variant='fluid-footer'>
      <ModalOverlay />
      <ModalContent>
        <ModalCloseButton />
        {children}
      </ModalContent>
    </Modal>
  )
}
