import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import { AssetId } from '@shapeshiftoss/caip'
import { useRef } from 'react'
import { MemoryRouter, Route, RouteComponentProps, Switch } from 'react-router-dom'
import { useModal } from 'hooks/useModal/useModal'

import { GetStarted } from './views/GetStarted'
import { LearnMore } from './views/LearnMore'

type GetStartedModalProps = {
  assetId: AssetId
}

export enum GetStartedModalRoutes {
  GetStarted = '/defi/modal/get-started',
  LearnMore = '/defi/modal/learn-more',
}

export const entries = [GetStartedModalRoutes.GetStarted, GetStartedModalRoutes.LearnMore]

const GetStartedModalRouter = ({
  assetId,
  location,
}: GetStartedModalProps & RouteComponentProps) => (
  <Switch location={location} key={location.key}>
    <Route path={GetStartedModalRoutes.GetStarted}>
      <GetStarted assetId={assetId} />
    </Route>
    <Route path={GetStartedModalRoutes.LearnMore}>
      <LearnMore assetId={assetId} />
    </Route>
  </Switch>
)

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
