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
import { useEffect, useRef, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { matchPath, MemoryRouter, Route, Switch, useLocation } from 'react-router-dom'
import { RouteSteps } from 'components/RouteSteps/RouteSteps'
import { StepConfig } from 'components/VerticalStepper/VerticalStepper'
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

const SINGLE_SIDED_STAKING_STEPS: Record<string, StepConfig[]> = {
  [StakeRoutes.Stake]: stakeSteps,
  [StakeRoutes.Unstake]: unstakeSteps,
  [ClaimPath.Confirm]: claimSteps,
}

const StakingModalContent = ({ assetId, validatorAddress }: StakingModalProps) => {
  const location = useLocation()
  const translate = useTranslate()
  const [steps, setSteps] = useState<StepConfig[]>()

  const isOverview = matchPath(location.pathname, {
    path: StakeRoutes.Overview,
    exact: true,
  })

  const isClaim = matchPath(location.pathname, {
    path: [ClaimPath.Confirm, ClaimPath.Broadcast],
    exact: true,
  })

  const hasSubSteps = matchPath(location.pathname, {
    path: [ClaimPath.Confirm, StakeRoutes.Stake, StakeRoutes.Unstake],
    exact: true,
  })

  useEffect(() => {
    if (!hasSubSteps?.path) return

    setSteps(SINGLE_SIDED_STAKING_STEPS[hasSubSteps.path])
  }, [hasSubSteps?.path])

  const handleStepCompleted = () => {
    setSteps(
      steps?.map(step => {
        const isCurrentStep = matchPath(location.pathname, {
          path: step.path,
          exact: true,
        })

        if (isCurrentStep) {
          return { ...step, isCompleted: true }
        }

        return step
      }),
    )
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
            {!isOverview && steps && (
              <RouteSteps assetSymbol={asset.symbol} routes={steps} location={location} />
            )}
            <ModalCloseButton borderRadius='full' />
            <Switch location={location}>
              <Route exact key={StakeRoutes.Stake} path={StakeRoutes.Stake}>
                <Stake assetId={assetId} validatorAddress={validatorAddress} />
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
                  onStepCompleted={handleStepCompleted}
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
                  onStepCompleted={handleStepCompleted}
                />
              </Route>
              <Route exact key={StakeRoutes.Unstake} path={StakeRoutes.Unstake}>
                <Unstake
                  assetId={assetId}
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
                  onStepCompleted={handleStepCompleted}
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
