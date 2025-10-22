import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { MemoryRouter } from 'react-router-dom'

import { Form } from './Form'

import { Dialog } from '@/components/Modal/components/Dialog'
import { sendRoutes } from '@/components/Modals/Send/SendCommon'
import { useModal } from '@/hooks/useModal/useModal'

export type SendModalProps = {
  assetId?: AssetId
  accountId?: AccountId
  input?: string
}

export const SendModal = ({ assetId, accountId, input }: SendModalProps) => {
  const { close, isOpen } = useModal('send')

  return (
    <Dialog isOpen={isOpen} onClose={close} isFullScreen>
      <MemoryRouter initialEntries={sendRoutes}>
        <Form initialAssetId={assetId} accountId={accountId} input={input} />
      </MemoryRouter>
    </Dialog>
  )
}
