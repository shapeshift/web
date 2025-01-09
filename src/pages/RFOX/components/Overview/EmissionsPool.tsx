import type { AssetId } from '@shapeshiftoss/caip'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import { bn } from '@shapeshiftoss/chain-adapters'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { fromBaseUnit } from 'lib/math'
import { getStakingContract } from 'pages/RFOX/helpers'
import { useAffiliateRevenueQuery } from 'pages/RFOX/hooks/useAffiliateRevenueQuery'
import { useCurrentEpochMetadataQuery } from 'pages/RFOX/hooks/useCurrentEpochMetadataQuery'
import { selectAssetById, selectMarketDataByAssetIdUserCurrency } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { StatItem } from './StatItem'

type EmissionsPoolProps = {
  stakingAssetId: AssetId
}

export const EmissionsPool: React.FC<EmissionsPoolProps> = ({ stakingAssetId }) => {
  const translate = useTranslate()

  const runeAsset = useAppSelector(state => selectAssetById(state, thorchainAssetId))
  const runeAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, thorchainAssetId),
  )

  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))

  const currentEpochMetadataResult = useCurrentEpochMetadataQuery()

  const affiliateRevenueResult = useAffiliateRevenueQuery<string>({
    startTimestamp: currentEpochMetadataResult.data?.epochStartTimestamp,
    endTimestamp: currentEpochMetadataResult.data?.epochEndTimestamp,
    select: (totalRevenue: bigint) => {
      return bn(fromBaseUnit(totalRevenue.toString(), runeAsset?.precision ?? 0))
        .times(runeAssetMarketData.price)
        .toFixed(2)
    },
  })

  const emissionsPoolUserCurrency = useMemo(() => {
    if (!affiliateRevenueResult.data) return
    if (!currentEpochMetadataResult.data) return

    const distributionRate =
      currentEpochMetadataResult.data.distributionRateByStakingContract[
        getStakingContract(stakingAssetId)
      ]

    return bn(affiliateRevenueResult.data).times(distributionRate).toFixed(2)
  }, [affiliateRevenueResult, currentEpochMetadataResult, stakingAssetId])

  return (
    <StatItem
      description={translate('RFOX.emissionsPool', { symbol: stakingAsset?.symbol })}
      helperDescription={translate('RFOX.emissionsPoolHelper', { symbol: stakingAsset?.symbol })}
      amountUserCurrency={emissionsPoolUserCurrency}
      isLoading={affiliateRevenueResult.isLoading || currentEpochMetadataResult.isLoading}
    />
  )
}
