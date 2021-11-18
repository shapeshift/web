import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import { MemoryRouter, Route, RouteComponentProps, Switch } from 'react-router-dom'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { AssetMarketData } from 'hooks/useAsset/useAsset'

import { ReceiveRouter } from './ReceiveRouter'

export enum ReceiveRoutes {
  Info = '/receive/info',
  Select = '/receive/select'
}

export const entries = [ReceiveRoutes.Info, ReceiveRoutes.Select]

type ReceivePropsType = {
  asset: AssetMarketData
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
