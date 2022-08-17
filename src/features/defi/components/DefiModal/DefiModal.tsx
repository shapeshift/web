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
export const DefiModal: React.FC<EarnModalProps> = ({ children, isOpen = false }) => {
  const { history, location } = useBrowserRouter()
  const handleClose = () => {
    history.replace({
      pathname: location.pathname,
    })
  }
  return (
    <Modal isOpen={isOpen} onClose={handleClose} variant='header-nav'>
      <ModalOverlay />
      <ModalContent
        width='full'
        borderRadius={{ base: 0, md: 'xl' }}
        minWidth={{ base: '100%', md: '500px' }}
        maxWidth={{ base: 'full', md: '500px' }}
      >
        {children}
      </ModalContent>
    </Modal>
  )
}
