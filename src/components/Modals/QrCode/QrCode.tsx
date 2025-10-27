import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { MemoryRouter } from 'react-router-dom'

import { initialEntries } from '../Send/SendCommon'
import { Form } from './Form'

import { Dialog } from '@/components/Modal/components/Dialog'
import { useModal } from '@/hooks/useModal/useModal'

export type QrCodeModalProps = {
  assetId?: AssetId
  accountId?: AccountId
}

export const QrCodeModal = ({ assetId, accountId }: QrCodeModalProps) => {
  const { close, isOpen } = useModal('qrCode')

  return (
    <Dialog isOpen={isOpen} onClose={close} isFullScreen>
      <MemoryRouter initialEntries={initialEntries}>
        <Form assetId={assetId} accountId={accountId} />
      </MemoryRouter>
    </Dialog>
  )
}
