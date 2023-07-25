import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import { AnimatePresence } from 'framer-motion'
import { MemoryRouter, Redirect, Route, Switch } from 'react-router'
import { useModal } from 'hooks/useModal/useModal'

import { ImportSuccess } from './views/ImportSuccess'
import { Notice } from './views/Notice'

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
          <Route>
            {({ location }) => (
              <AnimatePresence exitBeforeEnter initial={false}>
                <Switch key={location.key} location={location}>
                  <Route path='/success'>
                    <ImportSuccess />
                  </Route>
                  <Route path='/notice'>
                    <Notice />
                  </Route>
                  <Redirect exact from='/' to='/success' />
                </Switch>
              </AnimatePresence>
            )}
          </Route>
        </MemoryRouter>
      </ModalContent>
    </Modal>
  )
}
