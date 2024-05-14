import type { AccountId } from '@shapeshiftoss/caip'
import { useFoxyQuery } from 'features/defi/providers/foxy/components/FoxyManager/useFoxyQuery'
import { AnimatePresence } from 'framer-motion'
import { useMemo } from 'react'
import { Route, Switch, useLocation } from 'react-router'
import { SlideTransition } from 'components/SlideTransition'
import {
  makeTotalUndelegationsCryptoBaseUnit,
  serializeUserStakingId,
  supportsUndelegations,
  toOpportunityId,
} from 'state/slices/opportunitiesSlice/utils'
import { selectEarnUserStakingOpportunityByUserStakingId } from 'state/selectors'
import { useAppSelector } from 'state/store'

import { ClaimConfirm } from './ClaimConfirm'
import { ClaimStatus } from './ClaimStatus'

type ClaimRouteProps = {
  accountId: AccountId | undefined
  onBack: () => void
}

export const ClaimRoutes: React.FC<ClaimRouteProps> = ({ onBack, accountId }) => {
  const { contractAddress, stakingAssetId, chainId } = useFoxyQuery()

  const opportunityDataFilter = useMemo(() => {
    return {
      userStakingId: serializeUserStakingId(
        accountId ?? '',
        toOpportunityId({
          chainId,
          assetNamespace: 'erc20',
          assetReference: contractAddress,
        }),
      ),
    }
  }, [accountId, chainId, contractAddress])

  const foxyEarnOpportunityData = useAppSelector(state =>
    opportunityDataFilter
      ? selectEarnUserStakingOpportunityByUserStakingId(state, opportunityDataFilter)
      : undefined,
  )

  const undelegationAmount = useMemo(
    () =>
      foxyEarnOpportunityData && supportsUndelegations(foxyEarnOpportunityData)
        ? makeTotalUndelegationsCryptoBaseUnit(foxyEarnOpportunityData.undelegations).toFixed()
        : '0',
    [foxyEarnOpportunityData],
  )

  const location = useLocation()

  return (
    <SlideTransition>
      <AnimatePresence mode='wait' initial={false}>
        <Switch location={location} key={location.key}>
          <Route exact path='/'>
            <ClaimConfirm
              stakingAssetId={stakingAssetId}
              accountId={accountId}
              chainId={chainId}
              contractAddress={contractAddress}
              onBack={onBack}
              amount={undelegationAmount}
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
