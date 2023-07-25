import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { MemoryRouter } from 'react-router-dom'
import { useModal } from 'hooks/useModal/useModal'
import type { Asset } from 'lib/asset-service'

import { ReceiveRoutes } from './ReceiveCommon'
import { ReceiveRouter } from './ReceiveRouter'

export const entries = [ReceiveRoutes.Info, ReceiveRoutes.Select]

export type ReceivePropsType = {
  asset?: Asset
  accountId?: AccountId
}

const Receive = ({ asset, accountId }: ReceivePropsType) => {
  const { close, isOpen } = useModal('receive')

  return (
    <Modal isOpen={isOpen} onClose={close} isCentered>
      <ModalOverlay />
      <ModalContent>
        <MemoryRouter initialEntries={entries}>
          <ReceiveRouter assetId={asset?.assetId} accountId={accountId} />
        </MemoryRouter>
      </ModalContent>
    </Modal>
  )
}

export const ReceiveModal = Receive
