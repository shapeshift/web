import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import { GetStarted } from 'features/defi/components/GetStarted/GetStarted'
import { LearnMore } from 'features/defi/components/LearnMore/LearnMore'
import React, { useRef } from 'react'
import { MemoryRouter, Route, RouteComponentProps, Switch, useLocation } from 'react-router-dom'
import { useModal } from 'context/ModalProvider/ModalProvider'

type GetStartedModalProps = {
  assetId: string
}

export enum GetStartedModalRoutes {
  GetStarted = '/defi/modal/get-started',
  LearnMore = '/defi/modal/learn-more'
}

export const entries = [GetStartedModalRoutes.GetStarted, GetStartedModalRoutes.LearnMore]

const GetStartedModalRouter = ({ assetId, ...rest }) => {
  const location = useLocation()
  console.log({ assetId, rest })

  return (
    <Switch location={location} key={location.key}>
      <Route path='/defi/modal/get-started'>
        <GetStarted assetId={assetId} />
      </Route>
      <Route path='/defi/modal/learn-more'>
        <LearnMore assetId={assetId} />
      </Route>
    </Switch>
  )
}

export const GetStartedModal = ({ assetId }: GetStartedModalProps) => {
  const initialRef = useRef<HTMLInputElement>(null)
  const { cosmosGetStarted } = useModal()
  const { close, isOpen } = cosmosGetStarted

  return (
    <Modal isOpen={isOpen} onClose={close} isCentered initialFocusRef={initialRef}>
      <ModalOverlay />
      <ModalContent>
        <MemoryRouter initialEntries={entries}>
          <Switch>
            <Route
              path='/'
              component={(props: RouteComponentProps) => (
                <GetStartedModalRouter assetId={assetId} {...props} />
              )}
            />
          </Switch>
        </MemoryRouter>
      </ModalContent>
    </Modal>
  )
}
