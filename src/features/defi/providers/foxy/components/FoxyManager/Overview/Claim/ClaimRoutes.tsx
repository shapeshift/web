import type { AccountId } from '@shapeshiftoss/caip'
import { ethChainId, toAssetId } from '@shapeshiftoss/caip'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { AnimatePresence } from 'framer-motion'
import { useMemo } from 'react'
import { Route, Switch, useLocation } from 'react-router'
import { SlideTransition } from 'components/SlideTransition'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useFoxyBalances } from 'pages/Defi/hooks/useFoxyBalances'
import type { StakingId } from 'state/slices/opportunitiesSlice/types'
import {
  selectBIP44ParamsByAccountId,
  selectFirstAccountIdByChainId,
  selectStakingOpportunitiesById,
} from 'state/slices/selectors'
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
  accountId: AccountId | undefined
  onBack: () => void
}

export const ClaimRoutes: React.FC<ClaimRouteProps> = ({ onBack, accountId }) => {
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, assetReference: contractAddress, assetNamespace } = query
  const contractAssetId = toAssetId({ chainId, assetNamespace, assetReference: contractAddress })
  const opportunitiesMetadata = useAppSelector(state => selectStakingOpportunitiesById(state))

  const opportunityMetadata = useMemo(
    () => opportunitiesMetadata[contractAssetId as StakingId],
    [contractAssetId, opportunitiesMetadata],
  )

  // Staking Asset Info
  // The Staking asset is one of the only underlying Asset Ids FOX
  const stakingAssetId = opportunityMetadata?.underlyingAssetIds[0] ?? ''

  const accountFilter = useMemo(() => ({ accountId: accountId ?? '' }), [accountId])
  const bip44Params = useAppSelector(state => selectBIP44ParamsByAccountId(state, accountFilter))

  const { data: foxyBalancesData } = useFoxyBalances({
    accountNumber: bip44Params?.accountNumber ?? 0,
  })
  const opportunity = (foxyBalancesData?.opportunities || []).find(
    e => e.contractAddress === contractAddress,
  )
  const firstAccountId = useAppSelector(state => selectFirstAccountIdByChainId(state, ethChainId))
  const withdrawInfo = accountId
    ? // Look up the withdrawInfo for the current account, if we have one
      opportunity?.withdrawInfo[accountId]
    : // Else, get the withdrawInfo for the first account
      opportunity?.withdrawInfo[firstAccountId ?? '']
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
              amount={withdrawInfo?.amount}
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
