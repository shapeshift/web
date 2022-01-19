import { Modal, ModalCloseButton, ModalContent, ModalOverlay } from '@chakra-ui/modal'
import React from 'react'
import { useNavigate } from 'react-router-dom'

type EarnModalProps = {
  children: React.ReactNode
}

/**
 * Earn modal is linked to the router. When closed we return to the previous/background route
 */
export const EarnModal = ({ children }: EarnModalProps) => {
  let navigate = useNavigate()
  return (
    <Modal isOpen onClose={() => navigate(-1)} variant='fluid-footer'>
      <ModalOverlay />
      <ModalContent>
        <ModalCloseButton />
        {children}
      </ModalContent>
    </Modal>
  )
}
