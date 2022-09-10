import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { RouteComponentProps } from 'react-router-dom'
import { MemoryRouter, Route, Switch } from 'react-router-dom'
import { useModal } from 'hooks/useModal/useModal'
import type { AccountSpecifier } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'

import { ReceiveRoutes } from './ReceiveCommon'
import { ReceiveRouter } from './ReceiveRouter'

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
