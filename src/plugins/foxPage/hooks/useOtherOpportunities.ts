import { AssetId } from '@shapeshiftoss/caip'
import { DefiProvider } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import {
  foxEthLpOpportunityName,
  UNISWAP_V2_WETH_FOX_POOL_ADDRESS,
} from 'features/defi/providers/fox-eth-lp/constants'
import { FOX_FARMING_V4_CONTRACT_ADDRESS } from 'features/defi/providers/fox-farming/constants'
import { useFarmingApr } from 'plugins/foxPage/hooks/useFarmingApr'
import { useLpApr } from 'plugins/foxPage/hooks/useLpApr'
import { useMemo } from 'react'
import { bnOrZero } from 'lib/bignumber/bignumber'

import { FOX_ASSET_ID, FOXY_ASSET_ID, OpportunitiesBucket, OpportunityTypes } from '../FoxCommon'

export const useOtherOpportunities = (assetId: AssetId) => {
  const { farmingAprV4, isFarmingAprV4Loaded } = useFarmingApr()
  const { lpApr, isLpAprLoaded } = useLpApr()

  const otherOpportunities = useMemo(() => {
    const opportunities: Record<AssetId, OpportunitiesBucket[]> = {
      [FOX_ASSET_ID]: [
        {
          type: OpportunityTypes.Farming,
          title: 'plugins.foxPage.farming',
          opportunities: [
            {
              title: 'ETH-FOX UNI V4 Farm',
              isLoaded: isFarmingAprV4Loaded && isLpAprLoaded,
              apy:
                isFarmingAprV4Loaded && isLpAprLoaded
                  ? bnOrZero(farmingAprV4)
                      .plus(lpApr ?? 0)
                      .toString()
                  : null,
              link: 'https://fox.shapeshift.com/fox-farming/liquidity/0x470e8de2ebaef52014a47cb5e6af86884947f08c/staking/0x24fd7fb95dc742e23dc3829d3e656feeb5f67fa0/get-started',
              icons: [
                'https://assets.coincap.io/assets/icons/eth@2x.png',
                'https://assets.coincap.io/assets/icons/fox@2x.png',
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
              apy: isLpAprLoaded ? lpApr : null,
              link: 'https://fox.shapeshift.com/fox-farming/liquidity/0x470e8de2ebaef52014a47cb5e6af86884947f08c/lp-add',
              icons: [
                'https://assets.coincap.io/assets/icons/eth@2x.png',
                'https://assets.coincap.io/assets/icons/fox@2x.png',
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
  }, [lpApr, farmingAprV4, assetId, isLpAprLoaded, isFarmingAprV4Loaded])

  return otherOpportunities
}
