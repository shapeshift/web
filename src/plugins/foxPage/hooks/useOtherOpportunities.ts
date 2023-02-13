import type { AssetId } from '@shapeshiftoss/caip'
import { foxAssetId, foxyAssetId, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { foxyAddresses } from '@shapeshiftoss/investor-foxy'
import { DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useMemo } from 'react'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { foxEthLpAssetId, foxEthStakingAssetIdV5 } from 'state/slices/opportunitiesSlice/constants'
import type { StakingId } from 'state/slices/opportunitiesSlice/types'
import {
  selectAggregatedEarnUserLpOpportunity,
  selectHighestBalanceAccountIdByLpId,
  selectHighestBalanceAccountIdByStakingId,
  selectLpOpportunitiesById,
  selectStakingOpportunitiesById,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type { OpportunitiesBucket } from '../FoxCommon'
import { OpportunityTypes } from '../FoxCommon'

export const useOtherOpportunities = (assetId: AssetId) => {
  const highestFarmingBalanceAccountIdFilter = useMemo(
    () => ({
      stakingId: foxEthStakingAssetIdV5 as StakingId,
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

  const stakingOpportunities = useAppSelector(selectStakingOpportunitiesById)

  const foxFarmingOpportunityMetadata = useMemo(
    () => stakingOpportunities[foxEthStakingAssetIdV5 as StakingId],
    [stakingOpportunities],
  )

  const otherOpportunities = useMemo(() => {
    const opportunities: Record<AssetId, OpportunitiesBucket[]> = {
      [foxAssetId]: [
        {
          type: DefiType.Staking,
          title: 'plugins.foxPage.farming',
          opportunities: [
            ...(foxFarmingOpportunityMetadata
              ? [
                  {
                    ...foxFarmingOpportunityMetadata,
                    apy: Boolean(defaultLpOpportunityData && foxFarmingOpportunityMetadata)
                      ? bnOrZero(foxFarmingOpportunityMetadata?.apy)
                          .plus(defaultLpOpportunityData?.apy ?? 0)
                          .toString()
                      : undefined,
                    contractAddress: fromAssetId(foxFarmingOpportunityMetadata.assetId)
                      .assetReference,
                    highestBalanceAccountAddress:
                      highestFarmingBalanceAccountId &&
                      fromAccountId(highestFarmingBalanceAccountId).account,
                  },
                ]
              : []),
          ],
        },
        {
          type: DefiType.LiquidityPool,
          title: 'plugins.foxPage.liquidityPools',
          opportunities: [
            ...(foxEthLpOpportunity
              ? [
                  {
                    ...foxEthLpOpportunity,
                    type: DefiType.LiquidityPool,
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
              name: 'FOX',
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
              contractAddress: foxyAddresses[0].staking,
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
    foxFarmingOpportunityMetadata,
    foxEthLpOpportunity,
    highestBalanceLpAccountId,
    highestFarmingBalanceAccountId,
  ])

  return otherOpportunities
}
