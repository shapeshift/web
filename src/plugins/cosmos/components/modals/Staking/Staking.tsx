import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { useRef } from 'react'
import { matchPath, MemoryRouter, Route, Switch, useHistory, useLocation } from 'react-router-dom'
import { useModal } from 'context/ModalProvider/ModalProvider'

import { Overview } from './views/Overview'
import { Stake } from './views/Stake'
import { StakingConfirmProps } from './views/StakeConfirm'
import { StakeConfirm } from './views/StakeConfirm'
import { Unstake } from './views/Unstake'

export enum StakingAction {
  Stake = 'stake',
  Unstake = 'unstake',
  Overview = 'overview'
}

type StakingModalProps = {
  assetId: CAIP19
  action: StakingAction
}

enum StakeRoutes {
  Stake = '/stake',
  Unstake = '/unstake',
  StakeConfirm = '/stake/confirm',
  Overview = '/stake/overview'
}

export const entries = [
  StakeRoutes.Stake,
  StakeRoutes.Unstake,
  StakeRoutes.StakeConfirm,
  StakeRoutes.Overview
]

const StakingModalContent = ({ assetId, action }: StakingModalProps) => {
  const location = useLocation<StakingConfirmProps>()
  const history = useHistory()
  const isConfirmStep = matchPath(location.pathname, {
    path: StakeRoutes.StakeConfirm,
    exact: true
  })

  const initialRef = useRef<HTMLInputElement>(null)
  const { cosmosStaking } = useModal()
  const { close, isOpen } = cosmosStaking

  const handleCancel = () => {
    history.goBack()
  }

  const handleClose = () => {
    history.goBack()
    close()
  }

  const renderStakingRoutes = () => {
    if (action === StakingAction.Stake)
      return (
        <>
          <Route exact path={StakeRoutes.Stake}>
            <Stake
              assetId={assetId}
              apr='0.12'
              cryptoAmountAvailable='4242'
              fiatAmountAvailable='106050'
              marketData={{
                price: '25',
                marketCap: '999999',
                volume: '1000',
                changePercent24Hr: 2
              }}
            />
          </Route>
          <Route path={StakeRoutes.StakeConfirm}>
            <StakeConfirm
              cryptoAmount={location.state?.cryptoAmount}
              assetId={location.state?.assetId}
              fiatRate={location.state?.fiatRate}
              apr={location.state?.apr}
              onCancel={handleCancel}
            />
          </Route>
        </>
      )
    if (action === StakingAction.Unstake)
      return (
        <Route path='/'>
          <Unstake
            assetId={assetId}
            apr='0.12'
            cryptoAmountStaked='4242'
            marketData={{
              price: '25',
              marketCap: '999999',
              volume: '1000',
              changePercent24Hr: 2
            }}
          />
        </Route>
      )
    if (action === StakingAction.Overview)
      return (
        <Route path='/'>
          <Overview assetId={assetId} />
        </Route>
      )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      isCentered
      initialFocusRef={initialRef}
      variant={isConfirmStep ? 'fluid' : ''}
    >
      <ModalOverlay />
      <ModalContent>
        <Switch location={location}>{renderStakingRoutes()}</Switch>
      </ModalContent>
    </Modal>
  )
}
export const StakingModal = ({ assetId, action }: StakingModalProps) => (
  <MemoryRouter initialEntries={entries}>
    <StakingModalContent assetId={assetId} action={action} />
  </MemoryRouter>
)
