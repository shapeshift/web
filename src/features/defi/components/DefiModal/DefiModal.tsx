import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import React, { useCallback } from 'react'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'

type EarnModalProps = {
  children: React.ReactNode
  isOpen: boolean
}

const modalBorderRadius = { base: 0, md: '2xl' }
const modalMinWidth = { base: '100%', md: '500px' }
const modalMaxWidth = { base: 'full', md: '500px' }

/**
 * Earn modal is linked to the router. When closed we return to the previous/background route
 */
export const DefiModal: React.FC<EarnModalProps> = ({ children, isOpen = false }) => {
  const { history, location } = useBrowserRouter()

  const handleClose = useCallback(() => {
    history.replace({
      pathname: location.pathname,
    })
  }, [history, location.pathname])

  return (
    <Modal isOpen={isOpen} onClose={handleClose} variant='header-nav'>
      <ModalOverlay />
      <ModalContent
        width='full'
        borderRadius={modalBorderRadius}
        minWidth={modalMinWidth}
        maxWidth={modalMaxWidth}
      >
        {children}
      </ModalContent>
    </Modal>
  )
}
