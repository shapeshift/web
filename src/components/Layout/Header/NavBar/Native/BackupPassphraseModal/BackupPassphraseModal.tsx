import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import React from 'react'
import { MemoryRouter, Route, Switch } from 'react-router-dom'
import { useModal } from 'hooks/useModal/useModal'

import { BackupPassphraseRoutes } from './BackupPassphraseCommon'
import { BackupPassphraseRouter } from './BackupPassphraseRouter'

export const entries = [
  BackupPassphraseRoutes.Start,
  BackupPassphraseRoutes.Password,
  BackupPassphraseRoutes.Info,
  BackupPassphraseRoutes.Test,
  BackupPassphraseRoutes.Success,
]

type BackupPassphraseModalProps = {
  preventClose?: boolean
}

export const BackupPassphraseModal: React.FC<BackupPassphraseModalProps> = ({ preventClose }) => {
  const { backupNativePassphrase } = useModal()
  const { close, isOpen } = backupNativePassphrase

  return (
    <Modal
      isCentered
      closeOnOverlayClick={!preventClose}
      closeOnEsc={!preventClose}
      isOpen={isOpen}
      onClose={close}
    >
      <ModalOverlay />
      <ModalContent justifyContent='center' px={{ base: 0, md: 4 }} pt={3} pb={6}>
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
