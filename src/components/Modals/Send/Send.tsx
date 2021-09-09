import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import { useRef } from 'react'
import { MemoryRouter, Route, Switch } from 'react-router-dom'
import { useModal } from 'context/ModalProvider/ModalProvider'

import { Form } from './Form'

export const entries = ['/send/details', '/send/confirm']

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
