import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import { useRef } from 'react'
import { MemoryRouter, Route, Switch } from 'react-router-dom'
import { useModal } from 'context/ModalProvider/ModalProvider'

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

// explicitly type some props so they're not reflected as unknown
export const SendModal: React.FC<{}> = () => {
  const initialRef = useRef<HTMLInputElement>(null)
  const { send } = useModal()
  const { close, isOpen } = send

  return (
    <Modal isOpen={isOpen} onClose={close} isCentered initialFocusRef={initialRef}>
      <ModalOverlay />
      <ModalContent>
        <MemoryRouter initialEntries={entries}>
          <Switch>
            <Route path='/' component={Form} />
          </Switch>
        </MemoryRouter>
      </ModalContent>
    </Modal>
  )
}
