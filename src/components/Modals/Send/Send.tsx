import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { useRef } from 'react'
import { MemoryRouter, Route, Switch } from 'react-router-dom'

import { Form } from './Form'

export const entries = ['/send/details', '/send/confirm']

export const SendModal = () => {
  const initialRef = useRef<HTMLInputElement>(null)
  const modal = useModal()
  return (
    <Modal
      isOpen={modal.send}
      onClose={() => modal.close('send')}
      isCentered
      initialFocusRef={initialRef}
    >
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
