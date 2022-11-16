import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { AccountId } from '@shapeshiftoss/caip'
import { useRef } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { useModal } from 'hooks/useModal/useModal'

import { Form } from './Form'
import { SendRoutes } from './SendCommon'

export const entries = Object.values(SendRoutes)

type SendModalProps = {
  asset: Asset
  accountId?: AccountId
}

export const SendModal = ({ asset, accountId }: SendModalProps) => {
  const initialRef = useRef<HTMLInputElement>(null)
  const { send } = useModal()
  const { close, isOpen } = send

  return (
    <Modal isOpen={isOpen} onClose={close} isCentered initialFocusRef={initialRef}>
      <ModalOverlay />
      <ModalContent maxW='500px'>
        <MemoryRouter initialEntries={entries}>
          <Form asset={asset} accountId={accountId} />
        </MemoryRouter>
      </ModalContent>
    </Modal>
  )
}
