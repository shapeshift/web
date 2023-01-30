import type { AccountId } from '@shapeshiftoss/caip'
import { ethChainId } from '@shapeshiftoss/caip'
import { useFoxyQuery } from 'features/defi/providers/foxy/components/FoxyManager/useFoxyQuery'
import { AnimatePresence } from 'framer-motion'
import { useMemo } from 'react'
import { Route, Switch, useLocation } from 'react-router'
import { SlideTransition } from 'components/SlideTransition'
import { useFoxyBalances } from 'pages/Defi/hooks/useFoxyBalances'
import { selectBIP44ParamsByAccountId, selectFirstAccountIdByChainId } from 'state/slices/selectors'
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
  const { contractAddress, stakingAssetId, chainId, contractAssetId } = useFoxyQuery()

  const accountFilter = useMemo(() => ({ accountId: accountId ?? '' }), [accountId])
  const bip44Params = useAppSelector(state => selectBIP44ParamsByAccountId(state, accountFilter))

  const { data: foxyBalancesData } = useFoxyBalances({
    accountNumber: bip44Params?.accountNumber ?? 0,
  })
  const opportunity = (foxyBalancesData?.opportunities || []).find(
    e => e.contractAssetId === contractAssetId,
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
