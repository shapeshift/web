import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import type { Asset } from '@keepkey/asset-service'
import type { AccountId } from '@keepkey/caip'
import type { RouteComponentProps } from 'react-router-dom'
import { MemoryRouter, Route, Switch } from 'react-router-dom'
import { useModal } from 'hooks/useModal/useModal'

import { ReceiveRoutes } from './ReceiveCommon'
import { ReceiveRouter } from './ReceiveRouter'

export const entries = [ReceiveRoutes.Info, ReceiveRoutes.Select]

type ReceivePropsType = {
  asset: Asset
  accountId?: AccountId
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
