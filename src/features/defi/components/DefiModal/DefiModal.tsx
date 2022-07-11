import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/modal'
import React from 'react'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'

type EarnModalProps = {
  children: React.ReactNode
  isOpen: boolean
}

/**
 * Earn modal is linked to the router. When closed we return to the previous/background route
 */
export const DefiModal = ({ children, isOpen = false }: EarnModalProps) => {
  const { history, location } = useBrowserRouter()
  const handleClose = () => {
    history.replace({
      pathname: location.pathname,
    })
  }
  return (
    <Modal isOpen={isOpen} onClose={handleClose} variant='header-nav'>
      <ModalOverlay />
      <ModalContent>{children}</ModalContent>
    </Modal>
  )
}
