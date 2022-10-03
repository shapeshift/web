import { DefiProvider } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import type { EarnOpportunityType } from 'features/defi/helpers/normalizeOpportunity'
import { useEffect, useState } from 'react'
import {
  selectFeatureFlags,
  selectFoxEthLpOpportunityByAccountAddress,
  selectFoxFarmingOpportunitiesByAccountAddress,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type { ExternalOpportunity } from '../FoxCommon'

export const useDefiOpportunity = (opportunity: ExternalOpportunity, accountAddress?: string) => {
  const [defiOpportunity, setDefiOpportunity] = useState<EarnOpportunityType | null>(null)
  const foxFarmingOpportunities = useAppSelector(state =>
    selectFoxFarmingOpportunitiesByAccountAddress(state, {
      accountAddress: accountAddress ?? '',
    }),
  )
  const foxEthLpOpportunity = useAppSelector(state =>
    selectFoxEthLpOpportunityByAccountAddress(state, {
      accountAddress: accountAddress ?? '',
    }),
  )
  const featureFlags = useAppSelector(selectFeatureFlags)

  useEffect(() => {
    if (!opportunity.opportunityProvider) return
    if (!featureFlags.FoxLP && !featureFlags.FoxFarming) return
    switch (opportunity.opportunityProvider) {
      case DefiProvider.FoxFarming:
        if (!featureFlags.FoxFarming) return
        const foxFarmingOpportunity = foxFarmingOpportunities.find(
          foxFarmingOpportunity =>
            foxFarmingOpportunity.contractAddress === opportunity.opportunityContractAddress,
        )
        if (!foxFarmingOpportunity) return
        setDefiOpportunity(foxFarmingOpportunity)
        break
      case DefiProvider.FoxEthLP:
        if (!featureFlags.FoxLP) return
        setDefiOpportunity(foxEthLpOpportunity)
        break
      default:
        return
    }
  }, [
    featureFlags.FoxFarming,
    featureFlags.FoxLP,
    foxEthLpOpportunity,
    foxFarmingOpportunities,
    opportunity.opportunityContractAddress,
    opportunity.opportunityProvider,
  ])
  return { defiOpportunity }
}
