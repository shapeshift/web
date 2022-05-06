import {
  Heading,
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Stack,
  useColorModeValue,
} from '@chakra-ui/react'
import { CosmosActionButtons } from 'plugins/cosmos/components/CosmosActionButtons/CosmosActionButtons'
import { useRef } from 'react'
import { useTranslate } from 'react-polyglot'
import { matchPath, MemoryRouter, Route, Switch, useLocation } from 'react-router-dom'
import { RouteSteps } from 'components/RouteSteps/RouteSteps'
import { selectAssetById, selectFirstAccountSpecifierByChainId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { StakeFormManager } from './forms/StakeFormManager'
import {
  ClaimPath,
  claimSteps,
  entries,
  StakeRoutes,
  stakeSteps,
  StakingModalProps,
  StakingPath,
  unstakeSteps,
  UnstakingPath,
} from './StakingCommon'
import { ClaimBroadcast } from './views/ClaimBroadcast'
import { ClaimConfirm } from './views/ClaimConfirm'
import { Overview } from './views/Overview'
import { Stake } from './views/Stake'
import { StakeBroadcast } from './views/StakeBroadcast'
import { StakeConfirm } from './views/StakeConfirm'
import { Unstake } from './views/Unstake'
import { UnstakeBroadcast } from './views/UnstakeBroadcast'
import { UnstakeConfirm } from './views/UnstakeConfirm'

const StakingModalContent = ({ assetId, validatorAddress }: StakingModalProps) => {
  const location = useLocation()
  const translate = useTranslate()

  const isOverview = matchPath(location.pathname, {
    path: StakeRoutes.Overview,
    exact: true,
  })

  const isClaim = matchPath(location.pathname, {
    path: [ClaimPath.Confirm, ClaimPath.Broadcast],
    exact: true,
  })

  const isStake = matchPath(location.pathname, {
    path: [StakeRoutes.Stake, StakingPath.Confirm, StakingPath.Broadcast],
    exact: true,
  })

  const isUnstake = matchPath(location.pathname, {
    path: [StakeRoutes.Unstake, UnstakingPath.Confirm, UnstakingPath.Broadcast],
    exact: true,
  })

  const getCurrentSteps = () => {
    if (isStake) return stakeSteps
    if (isUnstake) return unstakeSteps

    return claimSteps
  }

  const headerBg = useColorModeValue('gray.50', 'gray.800')

  const initialRef = useRef<HTMLInputElement>(null)

  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const accountSpecifier = useAppSelector(state =>
    selectFirstAccountSpecifierByChainId(state, asset?.chainId),
  )

  if (!asset || !accountSpecifier) return null

  return (
    <StakeFormManager>
      {({ handleCancel, handleClose, isOpen }) => (
        <Modal isOpen={isOpen} onClose={handleClose} isCentered initialFocusRef={initialRef}>
          <ModalOverlay />
          <ModalContent width='100%' maxWidth='440px'>
            <ModalHeader textAlign='center' bg={headerBg} borderTopRadius='xl'>
              <Stack width='full' alignItems='center' spacing={2}>
                <Heading textTransform='capitalize' textAlign='center' fontSize='md'>
                  {!isClaim
                    ? translate('defi.assetStaking', { assetName: asset.symbol })
                    : translate('defi.claimAsset')}
                </Heading>
                {!isClaim && <CosmosActionButtons asset={asset} />}
              </Stack>
            </ModalHeader>
            {!isOverview && (
              <RouteSteps
                assetSymbol={asset.symbol}
                routes={getCurrentSteps()}
                location={location}
              />
            )}
            <ModalCloseButton borderRadius='full' />
            <Switch location={location}>
              <Route exact key={StakeRoutes.Stake} path={StakeRoutes.Stake}>
                <Stake assetId={assetId} apr='0.12' validatorAddress={validatorAddress} />
              </Route>
              <Route exact key={StakingPath.Confirm} path={StakingPath.Confirm}>
                <StakeConfirm
                  assetId={assetId}
                  validatorAddress={validatorAddress}
                  onCancel={handleCancel}
                />
              </Route>
              <Route exact key={StakingPath.Broadcast} path={StakingPath.Broadcast}>
                <StakeBroadcast
                  assetId={assetId}
                  validatorAddress={validatorAddress}
                  onClose={handleClose}
                  onCancel={handleCancel}
                />
              </Route>
              <Route exact key={UnstakingPath.Confirm} path={UnstakingPath.Confirm}>
                <UnstakeConfirm
                  assetId={assetId}
                  validatorAddress={validatorAddress}
                  onCancel={handleCancel}
                />
              </Route>
              <Route exact key={UnstakingPath.Broadcast} path={UnstakingPath.Broadcast}>
                <UnstakeBroadcast
                  assetId={assetId}
                  validatorAddress={validatorAddress}
                  onClose={handleClose}
                />
              </Route>
              <Route exact key={StakeRoutes.Unstake} path={StakeRoutes.Unstake}>
                <Unstake
                  assetId={assetId}
                  apr='0.12'
                  accountSpecifier={accountSpecifier}
                  validatorAddress={validatorAddress}
                />
              </Route>
              <Route exact key={ClaimPath.Confirm} path={ClaimPath.Confirm}>
                <ClaimConfirm
                  assetId={assetId}
                  accountSpecifier={accountSpecifier}
                  validatorAddress={validatorAddress}
                />
              </Route>
              <Route exact key={ClaimPath.Broadcast} path={ClaimPath.Broadcast}>
                <ClaimBroadcast
                  assetId={assetId}
                  validatorAddress={validatorAddress}
                  onClose={handleClose}
                />
              </Route>
              <Route key={StakeRoutes.Overview} path='/'>
                <Overview
                  assetId={assetId}
                  accountSpecifier={accountSpecifier}
                  validatorAddress={validatorAddress}
                />
              </Route>
            </Switch>
          </ModalContent>
        </Modal>
      )}
    </StakeFormManager>
  )
}
export const StakingModal = ({ assetId, validatorAddress }: StakingModalProps) => (
  <MemoryRouter initialEntries={entries}>
    <StakingModalContent assetId={assetId} validatorAddress={validatorAddress} />
  </MemoryRouter>
)
