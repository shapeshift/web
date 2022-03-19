import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/types'
import { Form as CosmosForm } from 'plugins/cosmos/components/modals/Send/Form'
import { useRef } from 'react'
import { MemoryRouter, Route, RouteComponentProps, Switch } from 'react-router-dom'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { AccountSpecifier } from 'state/slices/portfolioSlice/portfolioSlice'

import { Form } from './Form'

export enum SendRoutes {
  Select = '/send/select',
  Address = '/send/address',
  Details = '/send/details',
  Confirm = '/send/confirm',
  Scan = '/send/scan'
}

export const entries = [
  SendRoutes.Address,
  SendRoutes.Details,
  SendRoutes.Confirm,
  SendRoutes.Scan,
  SendRoutes.Select
]

type SendModalProps = {
  asset: Asset
  accountId?: AccountSpecifier
}

export const SendModal = ({ asset, accountId }: SendModalProps) => {
  const initialRef = useRef<HTMLInputElement>(null)
  const { send } = useModal()
  const { close, isOpen } = send

  return (
    <Modal isOpen={isOpen} onClose={close} isCentered initialFocusRef={initialRef}>
      <ModalOverlay />
      <ModalContent>
        <MemoryRouter initialEntries={entries}>
          <Switch>
            <Route
              path='/'
              component={(props: RouteComponentProps) => {
                // TODO(gomes): make this cleaner
                if (asset.caip19 === 'cosmos:cosmoshub-4/slip44:118') {
                  return <CosmosForm asset={asset} accountId={accountId} {...props} />
                }
                return <Form asset={asset} accountId={accountId} {...props} />
              }}
            />
          </Switch>
        </MemoryRouter>
      </ModalContent>
    </Modal>
  )
}
