import type { AssetId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { foxAssetId, foxyAssetId } from '@shapeshiftoss/caip'
import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import {
  foxEthLpAssetId,
  foxEthLpOpportunityName,
  UNISWAP_V2_WETH_FOX_POOL_ADDRESS,
} from 'features/defi/providers/fox-eth-lp/constants'
import { FOX_FARMING_V4_CONTRACT_ADDRESS } from 'features/defi/providers/fox-farming/constants'
import { useMemo } from 'react'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { foxEthStakingAssetIdV4 } from 'state/slices/opportunitiesSlice/constants'
import type { LpId, StakingId } from 'state/slices/opportunitiesSlice/types'
import {
  selectHighestBalanceAccountIdByLpId,
  selectHighestBalanceAccountIdByStakingId,
  selectLpOpportunitiesById,
  selectStakingOpportunitiesById,
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

  const lpOpportunitiesById = useAppSelector(state => selectLpOpportunitiesById(state))
  const stakingOpportunitiesById = useAppSelector(state => selectStakingOpportunitiesById(state))

  const defaultLpOpportunityData = useMemo(
    () => lpOpportunitiesById[foxEthLpAssetId as LpId],
    [lpOpportunitiesById],
  )
  const defaultStakingOpportunityData = useMemo(
    () => stakingOpportunitiesById[foxEthStakingAssetIdV4 as StakingId],
    [stakingOpportunitiesById],
  )

  const lpOpportunityId = foxEthLpAssetId
  const highestBalanceLpAccountIdFilter = useMemo(
    () => ({ lpId: lpOpportunityId }),
    [lpOpportunityId],
  )
  const highestBalanceLpAccountId = useAppSelector(state =>
    selectHighestBalanceAccountIdByLpId(state, highestBalanceLpAccountIdFilter),
  )

  const otherOpportunities = useMemo(() => {
    const opportunities: Record<AssetId, OpportunitiesBucket[]> = {
      [foxAssetId]: [
        {
          type: OpportunityTypes.Farming,
          title: 'plugins.foxPage.farming',
          opportunities: [
            {
              type: DefiType.Staking,
              title: 'ETH-FOX UNI V4 Farm',
              isLoaded: Boolean(defaultLpOpportunityData && defaultStakingOpportunityData),
              apy: Boolean(defaultLpOpportunityData && defaultStakingOpportunityData)
                ? bnOrZero(defaultStakingOpportunityData?.apy)
                    .plus(defaultLpOpportunityData?.apy ?? 0)
                    .toString()
                : undefined,
              icons: [
                'https://assets.coincap.io/assets/icons/eth@2x.png',
                'https://assets.coincap.io/assets/icons/256/fox.png',
              ],
              opportunityProvider: DefiProvider.FoxFarming,
              opportunityContractAddress: FOX_FARMING_V4_CONTRACT_ADDRESS,
              highestBalanceAccountAddress: highestFarmingBalanceAccountId
                ? fromAccountId(highestFarmingBalanceAccountId).account
                : undefined,
            },
          ],
        },
        {
          type: OpportunityTypes.LiquidityPool,
          title: 'plugins.foxPage.liquidityPools',
          opportunities: [
            {
              type: DefiType.LiquidityPool,
              title: foxEthLpOpportunityName,
              isLoaded: Boolean(defaultLpOpportunityData),
              apy: defaultLpOpportunityData?.apy,
              icons: [
                'https://assets.coincap.io/assets/icons/eth@2x.png',
                'https://assets.coincap.io/assets/icons/256/fox.png',
              ],
              opportunityProvider: DefiProvider.FoxEthLP,
              opportunityContractAddress: UNISWAP_V2_WETH_FOX_POOL_ADDRESS,
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
              title: 'FOX',
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
              title: 'ElasticSwap',
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
    defaultStakingOpportunityData,
    highestBalanceLpAccountId,
    highestFarmingBalanceAccountId,
  ])

  return otherOpportunities
}
