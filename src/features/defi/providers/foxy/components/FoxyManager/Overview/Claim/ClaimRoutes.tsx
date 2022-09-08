import type { AccountId } from '@shapeshiftoss/caip'
import { toAssetId } from '@shapeshiftoss/caip'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { AnimatePresence } from 'framer-motion'
import { Route, Switch, useLocation } from 'react-router'
import { SlideTransition } from 'components/SlideTransition'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useFoxyBalances } from 'pages/Defi/hooks/useFoxyBalances'
import { Nullable } from 'types/common'

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

export const ClaimRoutes: React.FC<ClaimRouteProps> = ({ onBack, accountId }) => {
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { contractAddress, assetReference, chainId } = query
  const assetNamespace = 'erc20'
  const stakingAssetId = toAssetId({
    chainId,
    assetNamespace,
    assetReference,
  })
  const { data: foxyBalancesData } = useFoxyBalances()
  const opportunity = (foxyBalancesData?.opportunities || []).find(
    e => e.contractAddress === contractAddress,
  )
  const location = useLocation()

  return (
    <SlideTransition>
      <AnimatePresence exitBeforeEnter initial={false}>
        <Switch location={location} key={location.key}>
          <Route exact path='/'>
            <ClaimConfirm
              assetId={stakingAssetId}
              accountId={accountId}
              chainId={chainId}
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
