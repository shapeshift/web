import { AssetId } from '@shapeshiftoss/caip'
import { useFarmingApr } from 'plugins/foxPage/hooks/useFarmingApr'
import { useLpApr } from 'plugins/foxPage/hooks/useLpApr'
import { useMemo } from 'react'

import { FOX_ASSET_ID, FOXY_ASSET_ID, OpportunitiesBucket, OpportunityTypes } from '../FoxCommon'

export const useOtherOpportunities = (assetId: AssetId) => {
  const { farmingApr, loaded: isFarmingAprLoaded } = useFarmingApr()
  const { lpApr, loaded: isLpAprLoaded } = useLpApr()

  const otherOpportunities = useMemo(() => {
    const opportunities: Record<AssetId, OpportunitiesBucket[]> = {
      [FOX_ASSET_ID]: [
        {
          type: OpportunityTypes.LiquidityPool,
          title: 'plugins.foxPage.liquidityPools',
          opportunities: [
            {
              title: 'ETH-FOX V2',
              isLoaded: isLpAprLoaded,
              apy: isLpAprLoaded ? lpApr : null,
              link: 'https://app.uniswap.org/#/add/v2/ETH/0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d?chain=mainnet',
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
              title: 'ETH-FOX V3',
              isLoaded: isFarmingAprLoaded,
              apy: isFarmingAprLoaded ? farmingApr : null,
              link: 'https://app.uniswap.org/#/add/ETH/0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d/3000?chain=mainnet',
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
                'https://raw.githubusercontent.com/shapeshift/lib/main/packages/asset-service/src/generateAssetData/ethTokens/icons/foxy-icon.png',
              ],
            },
          ],
        },
      ],
    }

    return opportunities[assetId]
  }, [lpApr, farmingApr, assetId, isLpAprLoaded, isFarmingAprLoaded])

  return otherOpportunities
}
