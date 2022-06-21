import { AssetId } from '@shapeshiftoss/caip'
import { useFarmingApr } from 'plugins/foxPage/hooks/useFarmingApr'
import { useLpApr } from 'plugins/foxPage/hooks/useLpApr'
import { useMemo } from 'react'

import { FOX_ASSET_ID, FOXY_ASSET_ID, OpportunitiesBucket, OpportunityTypes } from '../FoxCommon'
import { useFoxyApr } from './useFoxyApr'

export const useOtherOpportunities = (assetId: AssetId) => {
  const { farmingApr, loaded: isFarmingAprLoaded } = useFarmingApr()
  const { lpApr, loaded: isLpAprLoaded } = useLpApr()
  const { foxyApr, loaded: isFoxyAprLoaded } = useFoxyApr()

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
              title: 'ETH-FOX UNI V2 Farm',
              isLoaded: isFarmingAprLoaded,
              apy: isFarmingAprLoaded ? farmingApr : null,
              link: 'https://fox.shapeshift.com/fox-farming/liquidity/0x470e8de2ebaef52014a47cb5e6af86884947f08c/staking/0x212ebf9FD3c10F371557b08E993eAaB385c3932b/get-started',
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
              isLoaded: isFoxyAprLoaded,
              apy: isFoxyAprLoaded ? foxyApr : foxyApr,
              link: 'https://app.rari.capital/fuse/pool/79',
              icons: ['https://assets.coincap.io/assets/icons/fox@2x.png'],
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
  }, [lpApr, foxyApr, farmingApr, assetId, isLpAprLoaded, isFoxyAprLoaded, isFarmingAprLoaded])

  return otherOpportunities
}
