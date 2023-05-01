import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { useRef } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { useModal } from 'hooks/useModal/useModal'

import { Form } from './Form'
import { QrCodeRoutes } from './QrCodeCommon'

export const entries = Object.values(QrCodeRoutes)

type QrCodeModalProps = {
  assetId?: AssetId
  accountId?: AccountId
}

export const QrCodeModal = ({ assetId, accountId }: QrCodeModalProps) => {
  const initialRef = useRef<HTMLInputElement>(null)
  const { qrCode } = useModal()
  const { close, isOpen } = qrCode

  return (
    <Modal isOpen={isOpen} onClose={close} isCentered initialFocusRef={initialRef}>
      <ModalOverlay />
      <ModalContent maxW='500px'>
        <MemoryRouter initialEntries={entries}>
          <Form assetId={assetId} accountId={accountId} />
        </MemoryRouter>
      </ModalContent>
    </Modal>
  )
}
