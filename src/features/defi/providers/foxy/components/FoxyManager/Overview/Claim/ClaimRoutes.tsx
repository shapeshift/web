import type { AccountId } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import { useMemo } from 'react'
import { Route, Routes } from 'react-router-dom'

import { ClaimConfirm } from './ClaimConfirm'
import { ClaimStatus } from './ClaimStatus'

import { SlideTransition } from '@/components/SlideTransition'
import { useFoxyQuery } from '@/features/defi/providers/foxy/components/FoxyManager/useFoxyQuery'
import {
  makeTotalUndelegationsCryptoBaseUnit,
  serializeUserStakingId,
  supportsUndelegations,
  toOpportunityId,
} from '@/state/slices/opportunitiesSlice/utils'
import { selectEarnUserStakingOpportunityByUserStakingId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

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

  return (
    <SlideTransition>
      <AnimatePresence mode='wait' initial={false}>
        <Routes>
          <Route
            path='/'
            element={
              <ClaimConfirm
                stakingAssetId={stakingAssetId}
                accountId={accountId}
                chainId={chainId}
                contractAddress={contractAddress}
                onBack={onBack}
                amount={undelegationAmount}
              />
            }
          />
          <Route path='/status' element={<ClaimStatus accountId={accountId} />} />
        </Routes>
      </AnimatePresence>
    </SlideTransition>
  )
}
