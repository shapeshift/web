import { ModalContent, ModalOverlay } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { MemoryRouter } from 'react-router-dom'
import { Dialog } from 'components/Modal/components/Dialog'
import { useModal } from 'hooks/useModal/useModal'

import { SendRoutes } from '../Send/SendCommon'
import { Form } from './Form'

export const entries = Object.values(SendRoutes)

export type QrCodeModalProps = {
  assetId?: AssetId
  accountId?: AccountId
}

export const QrCodeModal = ({ assetId, accountId }: QrCodeModalProps) => {
  const { close, isOpen } = useModal('qrCode')

  return (
    <Dialog isOpen={isOpen} onClose={close} isFullScreen>
      <ModalOverlay />
      <ModalContent maxW='500px'>
        <MemoryRouter initialEntries={entries}>
          <Form assetId={assetId} accountId={accountId} />
        </MemoryRouter>
      </ModalContent>
    </Dialog>
  )
}
