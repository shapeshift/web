import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { useModal } from 'hooks/useModal/useModal'

import { BackupPassphraseRoutes } from './BackupPassphraseCommon'
import { BackupPassphraseRouter } from './BackupPassphraseRouter'

export const entries = Object.values(BackupPassphraseRoutes)

export type BackupPassphraseModalProps = {
  preventClose?: boolean
}

export const BackupPassphraseModal: React.FC<BackupPassphraseModalProps> = ({ preventClose }) => {
  const { close, isOpen } = useModal('backupNativePassphrase')

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
          <BackupPassphraseRouter />
        </MemoryRouter>
      </ModalContent>
    </Modal>
  )
}
