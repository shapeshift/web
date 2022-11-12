import type { AssetId } from '@shapeshiftoss/caip'
import { foxAssetId, foxyAssetId, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useMemo } from 'react'
import { bnOrZero } from 'lib/bignumber/bignumber'
import {
  foxEthLpAssetId,
  foxEthStakingAssetIdV4,
  v4EarnFarmingOpportunity,
} from 'state/slices/opportunitiesSlice/constants'
import type { LpId, StakingId } from 'state/slices/opportunitiesSlice/types'
import {
  selectAggregatedEarnUserStakingOpportunityByStakingId,
  selectHighestBalanceAccountIdByLpId,
  selectHighestBalanceAccountIdByStakingId,
  selectLpOpportunitiesById,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type { OpportunitiesBucket } from '../FoxCommon'
import { OpportunityTypes } from '../FoxCommon'

export const useOtherOpportunities = (assetId: AssetId) => {
  const highestFarmingBalanceAccountId = useAppSelector(state =>
    selectHighestBalanceAccountIdByStakingId(state, {
      stakingId: foxEthStakingAssetIdV4 as StakingId,
    }),
  )

  const lpOpportunitiesById = useAppSelector(selectLpOpportunitiesById)

  const defaultLpOpportunityData = useMemo(
    () => lpOpportunitiesById[foxEthLpAssetId as LpId],
    [lpOpportunitiesById],
  )
  const lpOpportunityId = foxEthLpAssetId
  const highestBalanceLpAccountIdFilter = useMemo(
    () => ({ lpId: lpOpportunityId as LpId }),
    [lpOpportunityId],
  )
  const highestBalanceLpAccountId = useAppSelector(state =>
    selectHighestBalanceAccountIdByLpId(state, highestBalanceLpAccountIdFilter),
  )

  const farmingv4EarnOpportunity = useAppSelector(state =>
    selectAggregatedEarnUserStakingOpportunityByStakingId(state, {
      stakingId: foxEthStakingAssetIdV4 as StakingId,
    }),
  )
  const otherOpportunities = useMemo(() => {
    // TODO: Normalize before opening this PR- this PR should be stripped away to just accessing selected data
    const opportunities: Record<AssetId, OpportunitiesBucket[]> = {
      [foxAssetId]: [
        {
          type: OpportunityTypes.Farming,
          title: 'plugins.foxPage.farming',
          opportunities: [
            ...(farmingv4EarnOpportunity
              ? [
                  {
                    ...farmingv4EarnOpportunity,
                    isLoaded: true,
                    apy: Boolean(defaultLpOpportunityData && farmingv4EarnOpportunity)
                      ? bnOrZero(farmingv4EarnOpportunity?.apy)
                          .plus(defaultLpOpportunityData?.apy ?? 0)
                          .toString()
                      : undefined,
                    opportunityProvider: farmingv4EarnOpportunity?.provider,
                    contractAddress: v4EarnFarmingOpportunity.contractAddress,
                    highestBalanceAccountAddress: highestFarmingBalanceAccountId
                      ? fromAccountId(highestFarmingBalanceAccountId).account
                      : undefined,
                  },
                ]
              : []),
          ],
        },
        {
          type: OpportunityTypes.LiquidityPool,
          title: 'plugins.foxPage.liquidityPools',
          opportunities: [
            {
              type: DefiType.LiquidityPool,
              opportunityName: defaultLpOpportunityData?.name!,
              isLoaded: Boolean(defaultLpOpportunityData),
              apy: defaultLpOpportunityData?.apy,
              icons: [
                'https://assets.coincap.io/assets/icons/eth@2x.png',
                'https://assets.coincap.io/assets/icons/256/fox.png',
              ],
              opportunityProvider: DefiProvider.FoxEthLP,
              contractAddress: fromAssetId(foxEthLpAssetId).assetReference,
              highestBalanceAccountAddress: highestBalanceLpAccountId
                ? fromAccountId(highestBalanceLpAccountId).account
                : undefined,
            },
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
    farmingv4EarnOpportunity,
    highestBalanceLpAccountId,
    highestFarmingBalanceAccountId,
  ])

  return otherOpportunities
}
