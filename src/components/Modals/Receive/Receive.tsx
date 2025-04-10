import type { AccountId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { MemoryRouter } from 'react-router-dom'

import { ReceiveRoutes } from './ReceiveCommon'
import { ReceiveRouter } from './ReceiveRouter'

import { Dialog } from '@/components/Modal/components/Dialog'
import { useModal } from '@/hooks/useModal/useModal'

export const entries = Object.values(ReceiveRoutes)

export type ReceivePropsType = {
  asset?: Asset
  accountId?: AccountId
}

const Receive = ({ asset, accountId }: ReceivePropsType) => {
  const { close, isOpen } = useModal('receive')

  return (
    <Dialog isOpen={isOpen} onClose={close} isFullScreen>
      <MemoryRouter initialEntries={entries}>
        <ReceiveRouter assetId={asset?.assetId} accountId={accountId} />
      </MemoryRouter>
    </Dialog>
  )
}

export const ReceiveModal = Receive
