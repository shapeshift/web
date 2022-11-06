import { fromAssetId } from '@shapeshiftoss/caip'
import { DefiProvider } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import type { EarnOpportunityType } from 'features/defi/helpers/normalizeOpportunity'
import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import {
  foxEthLpAssetId,
  LP_EARN_OPPORTUNITIES,
  STAKING_EARN_OPPORTUNITIES,
} from 'state/slices/opportunitiesSlice/constants'
import type { LpId } from 'state/slices/opportunitiesSlice/types'
import {
  selectAggregatedUserStakingOpportunities,
  selectAssets,
  selectLpOpportunitiesById,
  selectPortfolioCryptoHumanBalanceByAssetId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type { ExternalOpportunity } from '../FoxCommon'

export const useDefiOpportunity = (opportunity: ExternalOpportunity) => {
  const assets = useSelector(selectAssets)
  const [defiOpportunity, setDefiOpportunity] = useState<EarnOpportunityType | null>(null)

  const foxFarmingOpportunitiesAggregated = useAppSelector(selectAggregatedUserStakingOpportunities)
  const foxFarmingOpportunities = useMemo(
    () =>
      foxFarmingOpportunitiesAggregated.map(opportunity => ({
        ...STAKING_EARN_OPPORTUNITIES[foxEthLpAssetId],
        chainId: fromAssetId(foxEthLpAssetId).chainId,
        ...opportunity,
        isLoaded: true,
      })),
    [foxFarmingOpportunitiesAggregated],
  )

  const lpOpportunitiesById = useAppSelector(selectLpOpportunitiesById)
  const opportunityData = useMemo(
    () => lpOpportunitiesById[foxEthLpAssetId as LpId],
    [lpOpportunitiesById],
  )

  const baseEarnOpportunity = LP_EARN_OPPORTUNITIES[opportunityData?.underlyingAssetId]

  const aggregatedLpAssetBalance = useAppSelector(state =>
    selectPortfolioCryptoHumanBalanceByAssetId(state, { assetId: foxEthLpAssetId }),
  )

  // TODO: This doesn't belong here at all and needs a better shape
  // This is effectively coming back to the previous implementation with specific fields we don't need like
  // `underlyingFoxAmount` and `underlyingEthAmount`, surely we can pass the LP token value and calculate this in place
  // The `useXYZDefiNormalizedStakingEarnDefiSomethingOPportunities` hooks are going away soon so this isn't staying here for long
  const [underlyingEthAmount, underlyingFoxAmount] = useMemo(
    () =>
      opportunityData?.underlyingAssetIds.map((assetId, i) =>
        bnOrZero(aggregatedLpAssetBalance)
          .times(
            fromBaseUnit(
              opportunityData?.underlyingAssetRatios[i] ?? '0',
              assets[assetId].precision,
            ),
          )
          .toFixed(6)
          .toString(),
      ) ?? ['0', '0'],
    [
      aggregatedLpAssetBalance,
      assets,
      opportunityData?.underlyingAssetIds,
      opportunityData?.underlyingAssetRatios,
    ],
  )

  // TODO: toEarnOpportunity util something something
  const foxEthLpOpportunity = useMemo(
    () => ({
      ...baseEarnOpportunity,
      ...opportunityData,
      // TODO; All of these should be derived in one place, this is wrong, just an intermediary step to make tsc happy
      chainId: fromAssetId(baseEarnOpportunity.assetId).chainId,
      underlyingFoxAmount,
      underlyingEthAmount,
      cryptoAmount: aggregatedLpAssetBalance,
      // TODO: this all goes away anyway
      fiatAmount: '42',
      isLoaded: true,
    }),
    [
      aggregatedLpAssetBalance,
      baseEarnOpportunity,
      opportunityData,
      underlyingEthAmount,
      underlyingFoxAmount,
    ],
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
