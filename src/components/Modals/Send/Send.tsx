import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import { Asset } from '@shapeshiftoss/asset-service'
import { CHAIN_NAMESPACE, fromChainId } from '@shapeshiftoss/caip'
import { Form as CosmosForm } from 'plugins/cosmos/components/modals/Send/Form'
import { useRef } from 'react'
import { MemoryRouter, Route, RouteComponentProps, Switch } from 'react-router-dom'
import { useModal } from 'hooks/useModal/useModal'
import { AccountSpecifier } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'

import { Form } from './Form'
import { SendRoutes } from './SendCommon'

export const entries = [
  SendRoutes.Address,
  SendRoutes.Details,
  SendRoutes.Confirm,
  SendRoutes.Scan,
  SendRoutes.Select,
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
      <ModalContent maxW='500px'>
        <MemoryRouter initialEntries={entries}>
          <Switch>
            <Route
              path='/'
              component={(props: RouteComponentProps) => {
                const { chainNamespace } = fromChainId(asset.chainId)
                return chainNamespace === CHAIN_NAMESPACE.Cosmos ? (
                  <CosmosForm asset={asset} accountId={accountId} {...props} />
                ) : (
                  <Form asset={asset} accountId={accountId} {...props} />
                )
              }}
            />
          </Switch>
        </MemoryRouter>
      </ModalContent>
    </Modal>
  )
}
