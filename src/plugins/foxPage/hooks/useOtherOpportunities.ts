import { AssetId } from '@shapeshiftoss/caip'
import { useFarmingApr } from 'plugins/foxPage/hooks/useFarmingApr'
import { useLpApr } from 'plugins/foxPage/hooks/useLpApr'
import { useMemo } from 'react'

import { FOX_ASSET_ID, FOXY_ASSET_ID, OpportunitiesBucket, OpportunityTypes } from '../FoxCommon'

export const useOtherOpportunities = (assetId: AssetId) => {
  const { farmingAprV2, farmingAprV4, isFarmingAprV2Loaded, isFarmingAprV4Loaded } = useFarmingApr()
  const { lpApr, loaded: isLpAprLoaded } = useLpApr()

  const otherOpportunities = useMemo(() => {
    const opportunities: Record<AssetId, OpportunitiesBucket[]> = {
      [FOX_ASSET_ID]: [
        {
          type: OpportunityTypes.LiquidityPool,
          title: 'plugins.foxPage.liquidityPools',
          opportunities: [
            {
              title: 'ETH-FOX UNI V2',
              isLoaded: isLpAprLoaded,
              apy: isLpAprLoaded ? lpApr : null,
              link: 'https://fox.shapeshift.com/fox-farming/liquidity/0x470e8de2ebaef52014a47cb5e6af86884947f08c/lp-add',
              icons: [
                'https://assets.coincap.io/assets/icons/eth@2x.png',
                'https://assets.coincap.io/assets/icons/fox@2x.png',
              ],
            },
          ],
        },
        {
          type: OpportunityTypes.Farming,
          title: 'plugins.foxPage.farming',
          opportunities: [
            {
              title: 'ETH-FOX UNI V4 Farm',
              isLoaded: isFarmingAprV4Loaded,
              apy: isFarmingAprV4Loaded ? farmingAprV4 : null,
              link: 'https://fox.shapeshift.com/fox-farming/liquidity/0x470e8de2ebaef52014a47cb5e6af86884947f08c/staking/0x24fd7fb95dc742e23dc3829d3e656feeb5f67fa0/get-started',
              icons: [
                'https://assets.coincap.io/assets/icons/eth@2x.png',
                'https://assets.coincap.io/assets/icons/fox@2x.png',
              ],
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
              icons: ['https://assets.coincap.io/assets/icons/fox@2x.png'],
              isDisabled: true,
            },
          ],
        },
      ],
      [FOXY_ASSET_ID]: [
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
    lpApr,
    farmingAprV4,
    farmingAprV2,
    assetId,
    isLpAprLoaded,
    isFarmingAprV2Loaded,
    isFarmingAprV4Loaded,
  ])

  return otherOpportunities
}
