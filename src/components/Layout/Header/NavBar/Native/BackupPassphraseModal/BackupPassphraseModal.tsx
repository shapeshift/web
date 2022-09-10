import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import type { Vault } from '@shapeshiftoss/hdwallet-native-vault'
import { useState } from 'react'
import { MemoryRouter, Route, Switch } from 'react-router-dom'
import { useModal } from 'hooks/useModal/useModal'

import { BackupPassphraseRoutes } from './BackupPassphraseCommon'
import { BackupPassphraseRouter } from './BackupPassphraseRouter'

export const entries = [
  BackupPassphraseRoutes.Password,
  BackupPassphraseRoutes.Info,
  BackupPassphraseRoutes.Test,
  BackupPassphraseRoutes.Success,
]

type BackupPassphraseModalProps = {
  preventClose?: boolean
}

export const BackupPassphraseModal: React.FC<BackupPassphraseModalProps> = ({ preventClose }) => {
  const [vault, setVault] = useState<Vault | null>(null)
  const { backupNativePassphrase } = useModal()
  const { close, isOpen } = backupNativePassphrase

  const handleClose = () => {
    vault?.seal()
    close()
  }

  return (
    <Modal
      isCentered
      closeOnOverlayClick={!preventClose}
      closeOnEsc={!preventClose}
      isOpen={isOpen}
      onClose={handleClose}
    >
      <ModalOverlay />
      <ModalContent justifyContent='center' px={3} pt={3} pb={6}>
        <MemoryRouter initialEntries={entries}>
          <Switch>
            <Route path='/'>
              <BackupPassphraseRouter vault={vault} setVault={setVault} />
            </Route>
          </Switch>
        </MemoryRouter>
      </ModalContent>
    </Modal>
  )
}
