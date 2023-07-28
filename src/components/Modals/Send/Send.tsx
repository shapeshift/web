import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { useRef } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { useModal } from 'hooks/useModal/useModal'

import { Form } from './Form'
import { SendRoutes } from './SendCommon'

export const entries = Object.values(SendRoutes)

export type SendModalProps = {
  assetId?: AssetId
  accountId?: AccountId
  input?: string
}

export const SendModal = ({ assetId, accountId, input }: SendModalProps) => {
  const initialRef = useRef<HTMLInputElement>(null)
  const { close, isOpen } = useModal('send')

  return (
    <Modal isOpen={isOpen} onClose={close} isCentered initialFocusRef={initialRef}>
      <ModalOverlay />
      <ModalContent maxW='500px'>
        <MemoryRouter initialEntries={entries}>
          <Form initialAssetId={assetId} accountId={accountId} input={input} />
        </MemoryRouter>
      </ModalContent>
    </Modal>
  )
}
