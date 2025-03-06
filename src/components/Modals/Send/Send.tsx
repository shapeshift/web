import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { MemoryRouter } from 'react-router-dom'

import { Form } from './Form'
import { SendRoutes } from './SendCommon'

import { Dialog } from '@/components/Modal/components/Dialog'
import { useModal } from '@/hooks/useModal/useModal'

export const entries = Object.values(SendRoutes)

export type SendModalProps = {
  assetId?: AssetId
  accountId?: AccountId
  input?: string
}

export const SendModal = ({ assetId, accountId, input }: SendModalProps) => {
  const { close, isOpen } = useModal('send')

  return (
    <Dialog isOpen={isOpen} onClose={close} isFullScreen>
      <MemoryRouter initialEntries={entries}>
        <Form initialAssetId={assetId} accountId={accountId} input={input} />
      </MemoryRouter>
    </Dialog>
  )
}
