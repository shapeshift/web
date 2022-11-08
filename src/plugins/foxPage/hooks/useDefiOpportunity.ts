import { DefiProvider } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import type { EarnOpportunityType } from 'features/defi/helpers/normalizeOpportunity'
import { useEffect, useState } from 'react'
import { foxEthLpAssetId } from 'state/slices/opportunitiesSlice/constants'
import type { LpId } from 'state/slices/opportunitiesSlice/types'
import {
  selectAggregatedEarnUserLpOpportunity,
  selectAggregatedEarnUserStakingOpportunities,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type { ExternalOpportunity } from '../FoxCommon'

export const useDefiOpportunity = (opportunity: ExternalOpportunity) => {
  const [defiOpportunity, setDefiOpportunity] = useState<EarnOpportunityType | null>(null)

  const foxFarmingOpportunities = useAppSelector(selectAggregatedEarnUserStakingOpportunities)

  const foxEthLpOpportunity = useAppSelector(state =>
    selectAggregatedEarnUserLpOpportunity(state, {
      lpId: foxEthLpAssetId as LpId,
      assetId: foxEthLpAssetId ?? '',
    }),
  )

  useEffect(() => {
    if (!opportunity.type) return
    switch (opportunity.type) {
      case DefiProvider.FoxFarming:
        const foxFarmingOpportunity = foxFarmingOpportunities.find(
          foxFarmingOpportunity =>
            foxFarmingOpportunity.assetId === opportunity.opportunityContractAddress,
        )
        if (!foxFarmingOpportunity) return
        setDefiOpportunity(foxFarmingOpportunity)
        break
      case DefiProvider.FoxEthLP:
        setDefiOpportunity(foxEthLpOpportunity)
        break
      default:
        return
    }
  }, [
    foxEthLpOpportunity,
    foxFarmingOpportunities,
    opportunity.opportunityContractAddress,
    opportunity.opportunityProvider,
    opportunity.type,
  ])
  return { defiOpportunity }
}
