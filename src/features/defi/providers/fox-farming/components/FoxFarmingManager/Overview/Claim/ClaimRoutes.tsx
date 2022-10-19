import type { AccountId } from '@shapeshiftoss/caip'
import { foxAssetId } from '@shapeshiftoss/caip'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { AnimatePresence } from 'framer-motion'
import { useMemo } from 'react'
import { Route, Switch, useLocation } from 'react-router'
import { RouteSteps } from 'components/RouteSteps/RouteSteps'
import { SlideTransition } from 'components/SlideTransition'
import { useFoxEth } from 'context/FoxEthProvider/FoxEthProvider'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { selectFoxFarmingOpportunityByContractAddress } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import type { Nullable } from 'types/common'

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
  accountId: Nullable<AccountId>
  onBack: () => void
}

export const ClaimRoutes = ({ accountId, onBack }: ClaimRouteProps) => {
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { contractAddress, chainId } = query

  const { accountAddress } = useFoxEth()

  const filter = useMemo(
    () => ({ accountAddress, contractAddress }),
    [accountAddress, contractAddress],
  )
  const opportunity = useAppSelector(state =>
    selectFoxFarmingOpportunityByContractAddress(state, filter),
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
              accountId={accountId}
              assetId={foxAssetId}
              chainId={chainId}
              contractAddress={contractAddress}
              onBack={onBack}
              amount={rewardAmount!}
            />
          </Route>
          <Route exact path='/status'>
            <ClaimStatus accountId={accountId} />
          </Route>
        </Switch>
      </AnimatePresence>
    </SlideTransition>
  )
}
