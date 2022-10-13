import type { AssetId } from '@shapeshiftoss/caip'
import { foxAssetId, foxyAssetId } from '@shapeshiftoss/caip'
import { DefiProvider } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import {
  foxEthLpOpportunityName,
  UNISWAP_V2_WETH_FOX_POOL_ADDRESS,
} from 'features/defi/providers/fox-eth-lp/constants'
import { FOX_FARMING_V4_CONTRACT_ADDRESS } from 'features/defi/providers/fox-farming/constants'
import { useMemo } from 'react'
import { bnOrZero } from 'lib/bignumber/bignumber'
import {
  useGetFoxEthLpMetricsQuery,
  useGetFoxFarmingContractMetricsQuery,
} from 'state/slices/foxEthSlice/foxEthSlice'

import type { OpportunitiesBucket } from '../FoxCommon'
import { OpportunityTypes } from '../FoxCommon'

export const useOtherOpportunities = (assetId: AssetId) => {
  const { data: farmingV4Data, isSuccess: isFarmingAprV4Loaded } =
    useGetFoxFarmingContractMetricsQuery({ contractAddress: FOX_FARMING_V4_CONTRACT_ADDRESS })
  const { data: lpData, isSuccess: isLpAprLoaded } = useGetFoxEthLpMetricsQuery()

  const otherOpportunities = useMemo(() => {
    const opportunities: Record<AssetId, OpportunitiesBucket[]> = {
      [foxAssetId]: [
        {
          type: OpportunityTypes.Farming,
          title: 'plugins.foxPage.farming',
          opportunities: [
            {
              title: 'ETH-FOX UNI V4 Farm',
              isLoaded: isFarmingAprV4Loaded && isLpAprLoaded,
              apy:
                isFarmingAprV4Loaded && isLpAprLoaded
                  ? bnOrZero(farmingV4Data?.apy)
                      .plus(lpData?.apy ?? 0)
                      .toString()
                  : null,
              icons: [
                'https://assets.coincap.io/assets/icons/eth@2x.png',
                'https://assets.coincap.io/assets/icons/256/fox.png',
              ],
              opportunityProvider: DefiProvider.FoxFarming,
              opportunityContractAddress: FOX_FARMING_V4_CONTRACT_ADDRESS,
            },
          ],
        },
        {
          type: OpportunityTypes.LiquidityPool,
          title: 'plugins.foxPage.liquidityPools',
          opportunities: [
            {
              title: foxEthLpOpportunityName,
              isLoaded: isLpAprLoaded,
              apy: lpData?.apy ?? null,
              icons: [
                'https://assets.coincap.io/assets/icons/eth@2x.png',
                'https://assets.coincap.io/assets/icons/256/fox.png',
              ],
              opportunityProvider: DefiProvider.FoxEthLP,
              opportunityContractAddress: UNISWAP_V2_WETH_FOX_POOL_ADDRESS,
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
  }, [isFarmingAprV4Loaded, isLpAprLoaded, farmingV4Data?.apy, lpData?.apy, assetId])

  return otherOpportunities
}
