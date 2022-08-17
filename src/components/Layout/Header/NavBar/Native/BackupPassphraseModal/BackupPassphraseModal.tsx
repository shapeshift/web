import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import { MemoryRouter, Route, Switch } from 'react-router-dom'
import { useModal } from 'hooks/useModal/useModal'

import { BackupPassphraseRoutes } from './BackupPassphraseCommon'
import { BackupPassphraseRouter } from './BackupPassphraseRouter'

export const entries = [
  BackupPassphraseRoutes.Index,
  BackupPassphraseRoutes.Test,
  BackupPassphraseRoutes.Success,
]

export const BackupPassphraseModal = () => {
  const { settings } = useModal()
  const { close, isOpen } = settings

  return (
    <Modal isCentered closeOnOverlayClick closeOnEsc isOpen={isOpen} onClose={close}>
      <ModalOverlay />
      <ModalContent justifyContent='center' px={3} pt={3} pb={6}>
        <MemoryRouter initialEntries={entries}>
          <Switch>
            <Route path='/'>
              <BackupPassphraseRouter />
            </Route>
          </Switch>
        </MemoryRouter>
      </ModalContent>
    </Modal>
  )
}
