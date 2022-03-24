import {
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  useColorModeValue
} from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { Asset } from '@shapeshiftoss/types'
import { CosmosActionButtons } from 'plugins/cosmos/components/CosmosActionButtons/CosmosActionButtons'
import { useRef } from 'react'
import { matchPath, MemoryRouter, Route, Switch, useHistory, useLocation } from 'react-router-dom'
import { RouteSteps } from 'components/RouteSteps/RouteSteps'
import { Text } from 'components/Text'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { BigNumber, bnOrZero } from 'lib/bignumber/bignumber'

import { entries, StakeRoutes, StakingModalProps } from './StakingCommon'
import { ClaimBroadcast } from './views/ClaimBroadcast'
import { ClaimConfirm } from './views/ClaimConfirm'
import { ClaimConfirmRouter } from './views/ClaimConfirmRouter'
import { Overview } from './views/Overview'
import { Stake } from './views/Stake'
import { StakeBroadcast } from './views/StakeBroadcast'
import { StakeConfirm } from './views/StakeConfirm'
import { Unstake } from './views/Unstake'
import { UnstakeConfirm } from './views/UnstakeConfirm'

export enum StakingAction {
  Stake = 'stake',
  Unstake = 'unstake',
  Overview = 'overview',
  Claim = 'claim'
}
export type StakingModalLocation = {
  cryptoAmount: BigNumber
  assetId: CAIP19
  fiatRate: BigNumber
  apr: string
}

export type StakingModalProps = {
  assetId: CAIP19
}

export enum StakeRoutes {
  Overview = '/overview',
  Stake = '/stake',
  StakeConfirm = '/stake/confirm',
  StakeBroadcast = '/stake/broadcast',
  Unstake = '/unstake',
  UnstakeConfirm = '/unstake/confirm',
  UnstakeBroadcast = '/unstake/broadcast',
  ClaimConfirm = '/claim/confirm',
  ClaimBroadcast = '/claim/broadcast'
}

export const stakeSteps = [
  { step: 0, path: StakeRoutes.Stake, label: 'Amount' },
  { step: 1, path: StakeRoutes.StakeConfirm, label: 'Confirm' },
  { step: 2, path: StakeRoutes.StakeBroadcast, label: 'Broadcast' }
]

export const unstakeSteps = [
  { step: 0, path: StakeRoutes.Unstake, label: 'Amount' },
  { step: 1, path: StakeRoutes.UnstakeConfirm, label: 'Confirm' },
  { step: 2, path: StakeRoutes.UnstakeBroadcast, label: 'Broadcast' }
]

export const claimSteps = [
  { step: 0, path: StakeRoutes.ClaimConfirm, label: 'Confirm' },
  { step: 1, path: StakeRoutes.ClaimBroadcast, label: 'Broadcast' }
]

export const entries = [
  StakeRoutes.Overview,
  StakeRoutes.Stake,
  StakeRoutes.StakeConfirm,
  StakeRoutes.StakeBroadcast,
  StakeRoutes.Unstake,
  StakeRoutes.UnstakeConfirm,
  StakeRoutes.UnstakeBroadcast,
  StakeRoutes.ClaimConfirm,
  StakeRoutes.ClaimBroadcast
]

const StakingModalContent = ({ assetId, action }: StakingModalProps) => {
  const location = useLocation<StakingConfirmProps>()
  const history = useHistory()
  const isConfirmStep = matchPath(location.pathname, {
    path: [StakeRoutes.UnstakeConfirm],
    exact: true
  })

  const isOverview = matchPath(location.pathname, {
    path: [StakeRoutes.Overview, '/'],
    exact: true
  })

  const isClaimStep = matchPath(location.pathname, {
    path: [StakeRoutes.ClaimConfirm, StakeRoutes.ClaimBroadcast],
    exact: true
  })

  const isStakeStep = matchPath(location.pathname, {
    path: [StakeRoutes.Stake, StakeRoutes.StakeConfirm, StakeRoutes.StakeBroadcast],
    exact: true
  })

  const isUnstakeStep = matchPath(location.pathname, {
    path: [StakeRoutes.Unstake, StakeRoutes.UnstakeConfirm, StakeRoutes.UnstakeBroadcast],
    exact: true
  })

  const headerBg = useColorModeValue('gray.50', 'gray.800')
  const headerBorder = useColorModeValue('gray.100', 'gray.750')

  const initialRef = useRef<HTMLInputElement>(null)
  const { cosmosStaking } = useModal()
  const { close, isOpen } = cosmosStaking

  const handleCancel = () => {
    history.goBack()
  }

  const handleClose = () => {
    history.push(StakeRoutes.Overview)
    close()
  }

  const asset = (_ => ({
    name: 'Osmosis',
    symbol: 'OSMO',
    caip19: assetId
  }))(assetId) as Asset

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      isCentered
      initialFocusRef={initialRef}
      variant={isConfirmStep ? 'fluid' : ''}
    >
      <ModalOverlay />
      <ModalContent width='100%' maxWidth='440px'>
        <ModalHeader
          textAlign='center'
          bg={headerBg}
          borderBottomWidth='1px'
          borderColor={headerBorder}
          borderTopRadius='xl'
        >
          <Text
            translation={
              !isClaimStep ? ['defi.assetStaking', { assetName: asset.symbol }] : 'defi.claimAsset'
            }
            pb={isClaimStep ? '12px' : '0'}
          />
          {!isClaimStep && (
            <CosmosActionButtons
              asset={asset}
              activeRoute={
                isStakeStep
                  ? StakeRoutes.Stake
                  : isUnstakeStep
                  ? StakeRoutes.Unstake
                  : StakeRoutes.Overview
              }
              px='6px'
              py={isOverview ? '0' : '6px'}
              mb={isOverview ? '0' : '12px'}
            />
          )}
          {!isOverview && (
            <RouteSteps
              assetSymbol={asset.symbol}
              px={{
                base: '30px',
                md: isClaimStep ? '110px' : '50px'
              }}
              pb='0'
              bg='none'
              border='none'
              routes={isStakeStep ? stakeSteps : isUnstakeStep ? unstakeSteps : claimSteps}
              location={location}
            />
          )}
        </ModalHeader>
        <ModalCloseButton borderRadius='full' />
        <Switch location={location}>
          <Route exact key={StakeRoutes.Stake} path={StakeRoutes.Stake}>
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
          <Route exact key={StakeRoutes.StakeConfirm} path={StakeRoutes.StakeConfirm}>
            <StakeConfirm
              apr={location.state?.apr}
              cryptoStakeAmount={location.state?.cryptoAmount}
              assetId={assetId}
              fiatRate={location.state?.fiatRate}
              onCancel={handleCancel}
            />
          </Route>
          <Route exact key={StakeRoutes.StakeBroadcast} path={StakeRoutes.StakeBroadcast}>
            <StakeBroadcast
              apr={location.state?.apr}
              cryptoStakeAmount={location.state?.cryptoAmount}
              assetId={assetId}
              fiatRate={location.state?.fiatRate}
              onCancel={handleCancel}
            />
          </Route>
          <Route exact key={StakeRoutes.UnstakeConfirm} path={StakeRoutes.UnstakeConfirm}>
            <UnstakeConfirm
              assetId={assetId}
              cryptoUnstakeAmount={location.state?.cryptoAmount}
              fiatRate={location.state?.fiatRate}
              onCancel={handleCancel}
            />
          </Route>
          <Route exact key={StakeRoutes.UnstakeBroadcast} path={StakeRoutes.UnstakeBroadcast}>
            TODO Unstaking Broadcast component
          </Route>
          <Route exact key={StakeRoutes.Unstake} path={StakeRoutes.Unstake}>
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
          <Route exact key={StakeRoutes.ClaimConfirm} path={StakeRoutes.ClaimConfirm}>
            <ClaimConfirm
              cryptoStakeAmount={bnOrZero('0.04123')}
              fiatAmountAvailable='0.2365'
              assetId={assetId}
            />
          </Route>
          <Route exact key={StakeRoutes.ClaimBroadcast} path={StakeRoutes.ClaimBroadcast}>
            <ClaimBroadcast
              cryptoStakeAmount={location.state?.cryptoAmount}
              fiatAmountAvailable='0.2365'
              assetId={assetId}
              isLoading={true}
            />
          </Route>
          <Route key={StakeRoutes.Overview} path='/'>
            <Overview assetId={assetId} />
          </Route>
        </Switch>
      </ModalContent>
    </Modal>
  )
}
export const StakingModal = ({ assetId }: StakingModalProps) => (
  <MemoryRouter initialEntries={entries}>
    <StakingModalContent assetId={assetId} />
  </MemoryRouter>
)
