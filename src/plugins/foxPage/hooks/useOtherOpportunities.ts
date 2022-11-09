import type { AssetId } from '@shapeshiftoss/caip'
import { foxAssetId, foxyAssetId, fromAccountId } from '@shapeshiftoss/caip'
import { DefiProvider } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import {
  foxEthLpOpportunityName,
  UNISWAP_V2_WETH_FOX_POOL_ADDRESS,
} from 'features/defi/providers/fox-eth-lp/constants'
import { FOX_FARMING_V4_CONTRACT_ADDRESS } from 'features/defi/providers/fox-farming/constants'
import isEqual from 'lodash/isEqual'
import { useEffect, useMemo, useState } from 'react'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { foxEthApi } from 'state/slices/foxEthSlice/foxEthSlice'
import type { GetFoxFarmingContractMetricsReturn } from 'state/slices/foxEthSlice/types'
import {
  selectAccountIdsByAssetId,
  selectHighestBalanceFoxFarmingOpportunityAccountAddress,
  selectHighestBalanceFoxLpOpportunityAccountAddress,
} from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'
import type { Nullable } from 'types/common'

import type { OpportunitiesBucket } from '../FoxCommon'
import { OpportunityTypes } from '../FoxCommon'

export const useOtherOpportunities = (assetId: AssetId) => {
  const dispatch = useAppDispatch()
  const [lpApy, setLpApy] = useState<Nullable<string>>(null)
  const [farmingV4Data, setFarmingV4Data] =
    useState<Nullable<GetFoxFarmingContractMetricsReturn>>(null)
  const [isLpAprLoaded, setIsLpAprLoaded] = useState<boolean>(false)
  const [isFarmingAprV4Loaded, setIsFarmingAprV4Loaded] = useState<boolean>(false)

  const ethAccountIds = useAppSelector(s => selectAccountIdsByAssetId(s, null), isEqual)

  useEffect(() => {
    ;(async () => {
      if (!ethAccountIds?.length) return

      const ethAccountAddresses = ethAccountIds.map(accountId => fromAccountId(accountId).account)

      const metricsPromises = await Promise.all(
        ethAccountAddresses.map(
          async accountAddress =>
            await dispatch(
              foxEthApi.endpoints.getFoxEthLpMetrics.initiate({
                accountAddress,
              }),
            ),
        ),
      )

      // To get the APY, we need to fire the metrics requests for all accounts
      // However, it doesn't matter which account we introspect - it's going to be the same for all accounts
      const { isLoading, isSuccess, data } = metricsPromises[0]

      if (isLoading || !data) return

      if (isSuccess) {
        setLpApy(data.apy)
        setIsLpAprLoaded(true)
      }
    })()
  }, [ethAccountIds, dispatch])

  useEffect(() => {
    ;(async () => {
      if (!ethAccountIds?.length) return

      const ethAccountAddresses = ethAccountIds.map(accountId => fromAccountId(accountId).account)

      const metricsPromises = await Promise.all(
        ethAccountAddresses.map(
          async accountAddress =>
            await dispatch(
              foxEthApi.endpoints.getFoxFarmingContractMetrics.initiate({
                contractAddress: FOX_FARMING_V4_CONTRACT_ADDRESS,
                accountAddress,
              }),
            ),
        ),
      )

      // To get the FOX farming contract metrics data, it doesn't matter which account we introspect - it's going to be the same for all accounts
      const { isLoading, isSuccess, data } = metricsPromises[0]

      if (isLoading || !data) return

      if (isSuccess) {
        setFarmingV4Data(data)
        setIsFarmingAprV4Loaded(true)
      }
    })()
  }, [ethAccountIds, dispatch])

  const highestFarmingBalanceAccountAddressFilter = useMemo(
    () => ({
      contractAddress: FOX_FARMING_V4_CONTRACT_ADDRESS,
    }),
    [],
  )
  const highestFarmingBalanceAccountAddress = useAppSelector(state =>
    selectHighestBalanceFoxFarmingOpportunityAccountAddress(
      state,
      highestFarmingBalanceAccountAddressFilter,
    ),
  )

  const highestLpBalanceAccountAddress = useAppSelector(s =>
    selectHighestBalanceFoxLpOpportunityAccountAddress(s, null),
  )

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
                      .plus(lpApy ?? 0)
                      .toString()
                  : null,
              icons: [
                'https://assets.coincap.io/assets/icons/eth@2x.png',
                'https://assets.coincap.io/assets/icons/256/fox.png',
              ],
              opportunityProvider: DefiProvider.FoxFarming,
              opportunityContractAddress: FOX_FARMING_V4_CONTRACT_ADDRESS,
              highestBalanceAccountAddress: highestFarmingBalanceAccountAddress,
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
              apy: lpApy ?? null,
              icons: [
                'https://assets.coincap.io/assets/icons/eth@2x.png',
                'https://assets.coincap.io/assets/icons/256/fox.png',
              ],
              opportunityProvider: DefiProvider.FoxEthLP,
              opportunityContractAddress: UNISWAP_V2_WETH_FOX_POOL_ADDRESS,
              highestBalanceAccountAddress: highestLpBalanceAccountAddress,
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
    farmingV4Data?.apy,
    highestFarmingBalanceAccountAddress,
    highestLpBalanceAccountAddress,
    isFarmingAprV4Loaded,
    isLpAprLoaded,
    lpApy,
  ])

  return otherOpportunities
}
