import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import { AnimatePresence } from 'framer-motion'
import { MemoryRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'

import { ImportSuccess } from './views/ImportSuccess'
import { Notice } from './views/Notice'

import { useModal } from '@/hooks/useModal/useModal'

export const MobileWelcomeModal = () => {
  const { close: handleClose, isOpen } = useModal('mobileWelcomeModal')

  return (
    <Modal
      isCentered
      closeOnOverlayClick={false}
      closeOnEsc={false}
      isOpen={isOpen}
      onClose={handleClose}
    >
      <ModalOverlay />
      <ModalContent justifyContent='center' px={3} pt={3} pb={6}>
        <MemoryRouter>
          <AnimatePresence mode='wait' initial={false}>
            <RoutesWithAnimation />
          </AnimatePresence>
        </MemoryRouter>
      </ModalContent>
    </Modal>
  )
}

// Separate component to use the useLocation hook
const RoutesWithAnimation = () => {
  const location = useLocation()
  
  return (
    <Routes location={location}>
      <Route path='/success' element={<ImportSuccess />} />
      <Route path='/notice' element={<Notice />} />
      <Route path='/' element={<Navigate to='/success' replace />} />
    </Routes>
  )
}
