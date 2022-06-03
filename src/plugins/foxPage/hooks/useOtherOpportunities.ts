import { AssetId } from '@shapeshiftoss/caip'
import { useFarmingApr } from 'plugins/foxPage/hooks/useFarmingApr'
import { useLpApr } from 'plugins/foxPage/hooks/useLpApr'
import { useMemo } from 'react'

import { FoxAssetId, FoxyAssetId, OpportunitiesBucket, OpportunityTypes } from '../FoxCommon'
import { useFoxyApr } from './useFoxyApr'

export const useOtherOpportunities = (assetId: AssetId) => {
  const { farmingApr } = useFarmingApr()
  const { lpApr } = useLpApr()
  const { data } = useFoxyApr()

  const otherOpportunities = useMemo(() => {
    const opportunities: Record<AssetId, OpportunitiesBucket[]> = {
      [FoxAssetId]: [
        {
          type: OpportunityTypes.LiquidityPool,
          title: 'plugins.foxPage.liquidityPools',
          opportunities: [
            {
              title: 'ETH-FOX V2',
              apy: lpApr,
              link: '#',
              icons: ['https://assets.coincap.io/assets/icons/fox@2x.png'],
            },
          ],
        },
        {
          type: OpportunityTypes.Farming,
          title: 'plugins.foxPage.farming',
          opportunities: [
            {
              title: 'ETH-FOX V3',
              apy: farmingApr,
              link: '#',
              icons: [
                'https://assets.coincap.io/assets/icons/fox@2x.png',
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
              apy: data,
              link: '#',
              icons: ['https://assets.coincap.io/assets/icons/fox@2x.png'],
            },
          ],
        },
      ],
      [FoxyAssetId]: [
        {
          type: OpportunityTypes.LiquidityPool,
          title: 'plugins.foxPage.liquidityPools',
          opportunities: [
            {
              title: 'ElasticSwap',
              apy: '--',
              link: '#',
              icons: ['https://assets.coincap.io/assets/icons/fox@2x.png'],
            },
          ],
        },
      ],
    }

    return opportunities[assetId]
  }, [lpApr, data, farmingApr, assetId])

  return otherOpportunities
}
