import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import React, { useCallback } from 'react'
import { useNavigate } from 'react-router'

import { useModalRegistration } from '@/context/ModalStackProvider'
import { useBrowserRouter } from '@/hooks/useBrowserRouter/useBrowserRouter'

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
  'use no memo'
  const navigate = useNavigate()
  const { location } = useBrowserRouter()

  const handleClose = useCallback(() => {
    navigate(location.pathname, {
      replace: true,
    })
  }, [navigate, location.pathname])

  const { modalProps, overlayProps, modalContentProps } = useModalRegistration({
    isOpen,
    onClose: handleClose,
  })

  return (
    <Modal {...modalProps} onClose={handleClose} variant='header-nav'>
      <ModalOverlay {...overlayProps} />
      <ModalContent
        width='full'
        borderRadius={modalBorderRadius}
        minWidth={modalMinWidth}
        maxWidth={modalMaxWidth}
        {...modalContentProps}
      >
        {children}
      </ModalContent>
    </Modal>
  )
}
