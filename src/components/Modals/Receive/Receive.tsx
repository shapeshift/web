import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/types'
import { MemoryRouter, Route, RouteComponentProps, Switch } from 'react-router-dom'
import { useModal } from 'context/ModalProvider/ModalProvider'

import { ReceiveRouter } from './ReceiveRouter'

export enum ReceiveRoutes {
  Info = '/receive/info',
  Select = '/receive/select'
}

export const entries = [ReceiveRoutes.Info, ReceiveRoutes.Select]

type ReceivePropsType = {
  asset?: Asset
}

const Receive = ({ asset }: ReceivePropsType) => {
  const { receive } = useModal()
  const { close, isOpen } = receive

  return (
    <Modal isOpen={isOpen} onClose={close} isCentered>
      <ModalOverlay />
      <ModalContent>
        <MemoryRouter initialEntries={entries}>
          <Switch>
            <Route
              path='/'
              component={(props: RouteComponentProps) => <ReceiveRouter asset={asset} {...props} />}
            />
          </Switch>
        </MemoryRouter>
      </ModalContent>
    </Modal>
  )
}

export const ReceiveModal = Receive
