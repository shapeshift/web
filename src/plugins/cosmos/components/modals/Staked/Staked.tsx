import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import React, { useRef } from 'react'
import { MemoryRouter, Route, Switch } from 'react-router-dom'
import { useModal } from 'context/ModalProvider/ModalProvider'

import { Staked } from './views/Staked'

type StakedModalProps = {
  assetId: string
}

export enum StakedModalRoutes {
  Staked = '/defi/modal/staked'
}

export const entries = [StakedModalRoutes.Staked]

export const StakedModal = ({ assetId }: StakedModalProps) => {
  const initialRef = useRef<HTMLInputElement>(null)
  const { cosmosStaked } = useModal()
  const { close, isOpen } = cosmosStaked

  return (
    <Modal isOpen={isOpen} onClose={close} isCentered initialFocusRef={initialRef}>
      <ModalOverlay />
      <ModalContent>
        <MemoryRouter initialEntries={entries}>
          <Switch>
            <Route path='/'>
              <Staked assetId={assetId} />
            </Route>
          </Switch>
        </MemoryRouter>
      </ModalContent>
    </Modal>
  )
}
