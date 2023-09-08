import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { useRef } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { useModal } from 'hooks/useModal/useModal'

import { SendRoutes } from '../Send/SendCommon'
import { Form } from './Form'

export const entries = Object.values(SendRoutes)

export type QrCodeModalProps = {
  assetId?: AssetId
  accountId?: AccountId
}

export const QrCodeModal = ({ assetId, accountId }: QrCodeModalProps) => {
  const initialRef = useRef<HTMLInputElement>(null)
  const { close, isOpen } = useModal('qrCode')

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
