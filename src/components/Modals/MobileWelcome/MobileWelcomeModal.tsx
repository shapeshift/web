import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import { AnimatePresence } from 'framer-motion'
import { MemoryRouter, Navigate, useLocation } from 'react-router-dom'
import { Route, Switch } from 'wouter'

import { ImportSuccess } from './views/ImportSuccess'
import { Notice } from './views/Notice'

import { useModalRegistration } from '@/context/ModalStackProvider'
import { useModal } from '@/hooks/useModal/useModal'

const importSuccess = <ImportSuccess />
const notice = <Notice />
const successRedirect = <Navigate to='/success' replace />

export const MobileWelcomeModal = () => {
  const { close: handleClose, isOpen } = useModal('mobileWelcomeModal')
  const { modalProps, overlayProps, modalContentProps } = useModalRegistration({
    isOpen,
    onClose: handleClose,
    modalId: 'mobile-welcome-modal',
  })

  return (
    <Modal isCentered {...modalProps} closeOnOverlayClick={false} closeOnEsc={false}>
      <ModalOverlay {...overlayProps} />
      <ModalContent justifyContent='center' px={3} pt={3} pb={6} {...modalContentProps}>
        <MemoryRouter>
          <AnimatePresence mode='wait' initial={false}>
            <RoutesWithAnimation />
          </AnimatePresence>
        </MemoryRouter>
      </ModalContent>
    </Modal>
  )
}

const RoutesWithAnimation = () => {
  const location = useLocation()

  return (
    <Switch location={location.pathname}>
      <Route path='/success'>{importSuccess}</Route>
      <Route path='/notice'>{notice}</Route>
      <Route path='/'>{successRedirect}</Route>
    </Switch>
  )
}
