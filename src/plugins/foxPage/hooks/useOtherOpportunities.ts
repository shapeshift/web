import type { AssetId } from '@shapeshiftoss/caip'
import { foxAssetId, foxyAssetId, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useMemo } from 'react'
import { bnOrZero } from 'lib/bignumber/bignumber'
import {
  foxEthLpAssetId,
  foxEthStakingAssetIdV5,
  v5EarnFarmingOpportunity,
} from 'state/slices/opportunitiesSlice/constants'
import {
  selectAggregatedEarnUserLpOpportunity,
  selectAggregatedEarnUserStakingOpportunityByStakingId,
  selectHighestBalanceAccountIdByLpId,
  selectHighestBalanceAccountIdByStakingId,
  selectLpOpportunitiesById,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type { OpportunitiesBucket } from '../FoxCommon'
import { OpportunityTypes } from '../FoxCommon'

export const useOtherOpportunities = (assetId: AssetId) => {
  const highestFarmingBalanceAccountIdFilter = useMemo(
    () => ({
      stakingId: foxEthStakingAssetIdV5,
    }),
    [],
  )
  const highestFarmingBalanceAccountId = useAppSelector(state =>
    selectHighestBalanceAccountIdByStakingId(state, highestFarmingBalanceAccountIdFilter),
  )

  const lpOpportunitiesById = useAppSelector(selectLpOpportunitiesById)

  const defaultLpOpportunityData = useMemo(
    () => lpOpportunitiesById[foxEthLpAssetId],
    [lpOpportunitiesById],
  )
  const lpOpportunityId = foxEthLpAssetId
  const highestBalanceLpAccountIdFilter = useMemo(
    () => ({ lpId: lpOpportunityId }),
    [lpOpportunityId],
  )
  const highestBalanceLpAccountId = useAppSelector(state =>
    selectHighestBalanceAccountIdByLpId(state, highestBalanceLpAccountIdFilter),
  )

  const farmingv5EarnOpportunityFilter = useMemo(
    () => ({
      stakingId: foxEthStakingAssetIdV5,
    }),
    [],
  )
  const farmingv5EarnOpportunity = useAppSelector(state =>
    selectAggregatedEarnUserStakingOpportunityByStakingId(state, farmingv5EarnOpportunityFilter),
  )

  const foxEthLpOpportunityFilter = useMemo(
    () => ({
      lpId: foxEthLpAssetId,
      assetId: foxEthLpAssetId,
    }),
    [],
  )
  const foxEthLpOpportunity = useAppSelector(state =>
    selectAggregatedEarnUserLpOpportunity(state, foxEthLpOpportunityFilter),
  )

  const otherOpportunities = useMemo(() => {
    const opportunities: Record<AssetId, OpportunitiesBucket[]> = {
      [foxAssetId]: [
        {
          type: OpportunityTypes.Farming,
          title: 'plugins.foxPage.farming',
          opportunities: [
            ...(farmingv5EarnOpportunity
              ? [
                  {
                    ...farmingv5EarnOpportunity,
                    isLoaded: true,
                    apy: Boolean(defaultLpOpportunityData && farmingv5EarnOpportunity)
                      ? bnOrZero(farmingv5EarnOpportunity?.apy)
                          .plus(defaultLpOpportunityData?.apy ?? 0)
                          .toString()
                      : undefined,
                    contractAddress: v5EarnFarmingOpportunity.contractAddress,
                    highestBalanceAccountAddress:
                      highestFarmingBalanceAccountId &&
                      fromAccountId(highestFarmingBalanceAccountId).account,
                  },
                ]
              : []),
          ],
        },
        {
          type: OpportunityTypes.LiquidityPool,
          title: 'plugins.foxPage.liquidityPools',
          opportunities: [
            ...(foxEthLpOpportunity
              ? [
                  {
                    ...foxEthLpOpportunity,
                    type: DefiType.LiquidityPool,
                    isLoaded: true,
                    contractAddress: fromAssetId(foxEthLpAssetId).assetReference,
                    highestBalanceAccountAddress:
                      highestBalanceLpAccountId && fromAccountId(highestBalanceLpAccountId).account,
                  },
                ]
              : []),
          ],
        },
        {
          type: OpportunityTypes.BorrowingAndLending,
          title: 'plugins.foxPage.borrowingAndLending',
          opportunities: [
            {
              opportunityName: 'FOX',
              isLoaded: true,
              apy: null,
              link: 'https://app.rari.capital/fuse/pool/79',
              icons: ['https://assets.coincap.io/assets/icons/256/fox.png'],
              isDisabled: true,
            },
          ],
        },
      ],
      [foxyAssetId]: [
        {
          type: OpportunityTypes.LiquidityPool,
          title: 'plugins.foxPage.liquidityPools',
          opportunities: [
            {
              opportunityName: 'ElasticSwap',
              isLoaded: true, // No network request here
              apy: null,
              link: 'https://elasticswap.org/#/liquidity',
              icons: [
                'https://raw.githubusercontent.com/shapeshift/lib/main/packages/asset-service/src/generateAssetData/ethereum/icons/foxy-icon.png',
              ],
            },
          ],
        },
      ],
    }

    return opportunities[assetId]
  }, [
    assetId,
    defaultLpOpportunityData,
    farmingv5EarnOpportunity,
    foxEthLpOpportunity,
    highestBalanceLpAccountId,
    highestFarmingBalanceAccountId,
  ])

  return otherOpportunities
}
