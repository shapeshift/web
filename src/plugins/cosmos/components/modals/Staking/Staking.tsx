import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import { useRef } from 'react'
import { matchPath, MemoryRouter, Route, Switch, useHistory, useLocation } from 'react-router-dom'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { bnOrZero } from 'lib/bignumber/bignumber'

import { entries, StakeRoutes, StakingAction, StakingModalProps } from './StakingCommon'
import { ClaimConfirmRouter } from './views/ClaimConfirmRouter'
import { Overview } from './views/Overview'
import { Stake } from './views/Stake'
import { StakeConfirmRouter, StakingConfirmProps } from './views/StakeConfirmRouter'
import { Unstake } from './views/Unstake'
import { UnstakeConfirmRouter } from './views/UnstakeConfirmRouter'

const StakingModalContent = ({ assetId, action, validatorAddress }: StakingModalProps) => {
  const location = useLocation<StakingConfirmProps>()
  const history = useHistory()
  const isConfirmStep = matchPath(location.pathname, {
    path: [StakeRoutes.StakeConfirm, StakeRoutes.UnstakeConfirm],
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
              validatorAddress={validatorAddress}
            />
          </Route>
          <Route path={StakeRoutes.StakeConfirm}>
            <StakeConfirmRouter
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
        <>
          <Route exact path={StakeRoutes.UnstakeConfirm}>
            <UnstakeConfirmRouter
              assetId={assetId}
              cryptoAmount={location.state?.cryptoAmount}
              fiatRate={location.state?.fiatRate}
              onCancel={handleCancel}
            />
          </Route>
          <Route exact path='/stake'>
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
              validatorAddress={validatorAddress}
            />
          </Route>
        </>
      )
    if (action === StakingAction.Overview)
      return (
        <Route path='/'>
          <Overview assetId={assetId} validatorAddress={validatorAddress} />
        </Route>
      )

    if (action === StakingAction.Claim)
      return (
        <>
          <Route exact path={StakeRoutes.Stake}>
            <ClaimConfirmRouter
              cryptoAmount={bnOrZero('0.04123')}
              fiatAmountAvailable='0.2365'
              assetId={assetId}
            />
          </Route>
        </>
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
export const StakingModal = ({ assetId, action, validatorAddress }: StakingModalProps) => (
  <MemoryRouter initialEntries={entries}>
    <StakingModalContent assetId={assetId} action={action} validatorAddress={validatorAddress} />
  </MemoryRouter>
)
