import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import { BTCInputScriptType } from '@shapeshiftoss/hdwallet-core'
import { useRef } from 'react'
import { MemoryRouter, Route, RouteComponentProps, Switch } from 'react-router-dom'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { AssetMarketData } from 'hooks/useAsset/useAsset'

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
  asset: AssetMarketData
  currentScriptType?: BTCInputScriptType
}

export const SendModal = ({ asset, currentScriptType }: SendModalProps) => {
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
              component={(props: RouteComponentProps) => (
                <Form asset={asset} currentScriptType={currentScriptType} {...props} />
              )}
            />
          </Switch>
        </MemoryRouter>
      </ModalContent>
    </Modal>
  )
}
