import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'

import { BackupPassphraseRoutes } from './BackupPassphraseCommon'
import { BackupPassphraseRouter } from './BackupPassphraseRouter'

import { useModalRegistration } from '@/context/ModalStackProvider'
import { useModal } from '@/hooks/useModal/useModal'

export const entries = Object.values(BackupPassphraseRoutes)

export type BackupPassphraseModalProps = {
  preventClose?: boolean
}

const initialEntries = [BackupPassphraseRoutes.Start]

const modalContentPaddingX = { base: 0, md: 4 }

export const BackupPassphraseModal: React.FC<BackupPassphraseModalProps> = ({ preventClose }) => {
  const { close, isOpen } = useModal('backupNativePassphrase')
  const { modalContentProps, overlayProps, modalProps } = useModalRegistration({
    isOpen,
    onClose: close,
    modalId: 'backup-native-passphrase-modal',
  })

  return (
    <Modal
      isCentered
      {...modalProps}
      closeOnOverlayClick={!preventClose}
      closeOnEsc={!preventClose}
    >
      <ModalOverlay {...overlayProps} />
      <ModalContent
        justifyContent='center'
        px={modalContentPaddingX}
        pt={3}
        pb={6}
        {...modalContentProps}
      >
        <MemoryRouter initialEntries={initialEntries} initialIndex={0}>
          <BackupPassphraseRouter />
        </MemoryRouter>
      </ModalContent>
    </Modal>
  )
}
