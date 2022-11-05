import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import type { Asset } from '@keepkey/asset-service'
import type { AccountId } from '@keepkey/caip'
import { useRef } from 'react'
import type { RouteComponentProps } from 'react-router-dom'
import { MemoryRouter, Route, Switch } from 'react-router-dom'
import { useModal } from 'hooks/useModal/useModal'

import { Form } from './Form'
import { SendRoutes } from './SendCommon'

export const entries = [
  SendRoutes.Address,
  SendRoutes.Details,
  SendRoutes.Confirm,
  SendRoutes.Scan,
  SendRoutes.Select,
]

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
          <Switch>
            <Route
              path='/'
              component={(props: RouteComponentProps) => (
                <Form asset={asset} accountId={accountId} {...props} />
              )}
            />
          </Switch>
        </MemoryRouter>
      </ModalContent>
    </Modal>
  )
}
