import { foxAssetId } from '@shapeshiftoss/caip'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { AnimatePresence } from 'framer-motion'
import { Route, Switch, useLocation } from 'react-router'
import { RouteSteps } from 'components/RouteSteps/RouteSteps'
import { SlideTransition } from 'components/SlideTransition'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { selectFoxFarmingOpportunityByContractAddress } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ClaimConfirm } from './ClaimConfirm'
import { ClaimStatus } from './ClaimStatus'

enum OverviewPath {
  Claim = '/',
  ClaimStatus = '/status',
}

export const routes = [
  { step: 0, path: OverviewPath.Claim, label: 'Confirm' },
  { step: 1, path: OverviewPath.ClaimStatus, label: 'Status' },
]

type ClaimRouteProps = {
  onBack: () => void
}

export const ClaimRoutes = ({ onBack }: ClaimRouteProps) => {
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { contractAddress, chainId } = query
  const opportunity = useAppSelector(state =>
    selectFoxFarmingOpportunityByContractAddress(state, contractAddress),
  )
  const location = useLocation()

  if (!opportunity) return null
  const rewardAmount = opportunity.unclaimedRewards

  return (
    <SlideTransition>
      <RouteSteps routes={routes} location={location} pt={4} />
      <AnimatePresence exitBeforeEnter initial={false}>
        <Switch location={location} key={location.key}>
          <Route exact path='/'>
            <ClaimConfirm
              assetId={foxAssetId}
              chainId={chainId}
              contractAddress={contractAddress}
              onBack={onBack}
              amount={rewardAmount!}
            />
          </Route>
          <Route exact path='/status' component={ClaimStatus} />
        </Switch>
      </AnimatePresence>
    </SlideTransition>
  )
}
