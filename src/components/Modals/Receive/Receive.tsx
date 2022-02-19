import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/types'
import { MemoryRouter, Route, RouteComponentProps, Switch } from 'react-router-dom'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { AccountSpecifier } from 'state/slices/portfolioSlice/portfolioSlice'

import { ReceiveRouter } from './ReceiveRouter'

export enum ReceiveRoutes {
  Info = '/receive/info',
  Select = '/receive/select'
}

export const entries = [ReceiveRoutes.Info, ReceiveRoutes.Select]

type ReceivePropsType = {
  asset?: Asset
  accountId?: AccountSpecifier
}

const Receive = ({ asset, accountId }: ReceivePropsType) => {
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
              component={(props: RouteComponentProps) => (
                <ReceiveRouter asset={asset} accountId={accountId} {...props} />
              )}
            />
          </Switch>
        </MemoryRouter>
      </ModalContent>
    </Modal>
  )
}

export const ReceiveModal = Receive
