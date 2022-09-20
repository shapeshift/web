import { foxAssetId } from '@shapeshiftoss/caip'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { AnimatePresence } from 'framer-motion'
import { Route, Switch, useLocation } from 'react-router'
import { RouteSteps } from 'components/RouteSteps/RouteSteps'
import { SlideTransition } from 'components/SlideTransition'
import { useFoxEth } from 'context/FoxEthProvider/FoxEthProvider'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'

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
  const { foxFarmingOpportunities } = useFoxEth()
  const opportunity = foxFarmingOpportunities.find(e => e.contractAddress === contractAddress)
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
