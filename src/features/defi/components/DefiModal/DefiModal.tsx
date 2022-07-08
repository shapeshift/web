import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/modal'
import React from 'react'
import { useHistory } from 'react-router-dom'

type EarnModalProps = {
  children: React.ReactNode
  isOpen: boolean
}

/**
 * Earn modal is linked to the router. When closed we return to the previous/background route
 */
export const DefiModal = ({ children, isOpen = false }: EarnModalProps) => {
  const history = useHistory()
  const handleClose = () => {
    history.replace({
      pathname: `/defi/earn`,
    })
  }
  return (
    <Modal isOpen={isOpen} onClose={handleClose} variant='header-nav'>
      <ModalOverlay />
      <ModalContent>{children}</ModalContent>
    </Modal>
  )
}
