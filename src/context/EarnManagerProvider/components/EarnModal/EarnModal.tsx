import { Modal, ModalCloseButton, ModalContent, ModalOverlay } from '@chakra-ui/modal'
import React from 'react'
import { useHistory } from 'react-router-dom'
import { EarnActionsProvider } from 'context/EarnManagerProvider/context/EarnActions/EarnActionsProvider'

type EarnModalProps = {
  children: React.ReactNode
}

/**
 * Earn modal is linked to the router. When closed we return to the previous/background route
 */
export const EarnModal = ({ children }: EarnModalProps) => {
  const history = useHistory()
  return (
    <EarnActionsProvider>
      <Modal isOpen onClose={history.goBack} variant='fluid'>
        <ModalOverlay />
        <ModalContent>
          <ModalCloseButton />
          {children}
        </ModalContent>
      </Modal>
    </EarnActionsProvider>
  )
}
