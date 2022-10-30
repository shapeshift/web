import { DefiProvider } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import type { EarnOpportunityType } from 'features/defi/helpers/normalizeOpportunity'
import { useEffect, useMemo, useState } from 'react'
import {
  selectFoxEthLpAccountsOpportunitiesAggregated,
  selectFoxFarmingAccountsOpportunitiesAggregated,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type { ExternalOpportunity } from '../FoxCommon'

export const useDefiOpportunity = (opportunity: ExternalOpportunity) => {
  const [defiOpportunity, setDefiOpportunity] = useState<EarnOpportunityType | null>(null)
  const emptyFilter = useMemo(() => ({}), [])
  const foxFarmingOpportunities = useAppSelector(state =>
    selectFoxFarmingAccountsOpportunitiesAggregated(state, emptyFilter),
  )
  const foxEthLpOpportunity = useAppSelector(state =>
    selectFoxEthLpAccountsOpportunitiesAggregated(state, emptyFilter),
  )

  useEffect(() => {
    if (!opportunity.opportunityProvider) return
    switch (opportunity.opportunityProvider) {
      case DefiProvider.FoxFarming:
        const foxFarmingOpportunity = foxFarmingOpportunities.find(
          foxFarmingOpportunity =>
            foxFarmingOpportunity.contractAddress === opportunity.opportunityContractAddress,
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
  ])
  return { defiOpportunity }
}
