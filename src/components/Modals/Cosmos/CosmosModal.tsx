import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import { GetStarted } from 'features/defi/components/GetStarted/GetStarted'
import { LearnMore } from 'features/defi/components/LearnMore/LearnMore'
import React, { useRef } from 'react'
import { MemoryRouter, Route, Switch } from 'react-router-dom'
import { useModal } from 'context/ModalProvider/ModalProvider'

type CosmosModalProps = {
  assetId: string
}

export enum CosmosModalRoutes {
  GetStarted = '/defi/modal/get-started',
  LearnMore = '/defi/modal/learn-more'
}

export const entries = [CosmosModalRoutes.GetStarted, CosmosModalRoutes.LearnMore]

export const CosmosModal = ({ assetId }: CosmosModalProps) => {
  const initialRef = useRef<HTMLInputElement>(null)
  const { cosmos } = useModal()
  const { close, isOpen } = cosmos

  return (
    <Modal isOpen={isOpen} onClose={close} isCentered initialFocusRef={initialRef}>
      <ModalOverlay />
      <ModalContent>
        <MemoryRouter initialEntries={entries}>
          <Switch>
            <Route path='/defi/modal/get-started'>
              <GetStarted assetId={assetId} />
            </Route>
            <Route path='/defi/modal/learn-more'>
              <LearnMore assetId={assetId} />
            </Route>
          </Switch>
        </MemoryRouter>
      </ModalContent>
    </Modal>
  )
}
