import { AssetNamespace, toCAIP19 } from '@shapeshiftoss/caip'
import { NetworkTypes } from '@shapeshiftoss/types'
import { DefiParams, DefiQueryParams } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { AnimatePresence } from 'framer-motion'
import { Route, Switch, useLocation } from 'react-router'
import { RouteSteps } from 'components/RouteSteps/RouteSteps'
import { SlideTransition } from 'components/SlideTransition'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useFoxyBalances } from 'pages/Defi/hooks/useFoxyBalances'

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

type CliamRouteProps = {
  onBack: () => void
}

export const ClaimRoutes = ({ onBack }: CliamRouteProps) => {
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { contractAddress, tokenId, chain } = query
  const network = NetworkTypes.MAINNET
  const assetNamespace = AssetNamespace.ERC20
  const stakingAssetCAIP19 = toCAIP19({
    chain,
    network,
    assetNamespace,
    assetReference: tokenId,
  })
  const { opportunities } = useFoxyBalances()
  const opportunity = opportunities.find(e => e.contractAddress === contractAddress)
  const location = useLocation()

  return (
    <SlideTransition>
      <RouteSteps routes={routes} location={location} />
      <AnimatePresence exitBeforeEnter initial={false}>
        <Switch location={location} key={location.key}>
          <Route exact path='/'>
            <ClaimConfirm
              assetId={stakingAssetCAIP19}
              chain={chain}
              contractAddress={contractAddress}
              onBack={onBack}
              amount={opportunity?.withdrawInfo.amount}
            />
          </Route>
          <Route exact path='/status' component={ClaimStatus} />
        </Switch>
      </AnimatePresence>
    </SlideTransition>
  )
}
