import type { AssetId } from '@shapeshiftoss/caip'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import { bn, bnOrZero } from '@shapeshiftoss/chain-adapters'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { StatItem } from './StatItem'

import { fromBaseUnit } from '@/lib/math'
import { getStakingContract } from '@/pages/RFOX/helpers'
import { useAffiliateRevenueQuery } from '@/pages/RFOX/hooks/useAffiliateRevenueQuery'
import { useCurrentEpochMetadataQuery } from '@/pages/RFOX/hooks/useCurrentEpochMetadataQuery'
import { selectAssetById, selectMarketDataByAssetIdUserCurrency } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

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

  const currentEpochMetadataQuery = useCurrentEpochMetadataQuery()

  const affiliateRevenueQuery = useAffiliateRevenueQuery({
    startTimestamp: currentEpochMetadataQuery.data?.epochStartTimestamp,
    endTimestamp: currentEpochMetadataQuery.data?.epochEndTimestamp,
  })

  const emissionsPoolUserCurrency = useMemo(() => {
    if (!affiliateRevenueQuery.data) return
    if (!currentEpochMetadataQuery.data) return

    const affiliateRevenueUserCurrency = bn(
      fromBaseUnit(affiliateRevenueQuery.data.toString(), runeAsset?.precision ?? 0),
    )
      .times(bnOrZero(runeAssetMarketData?.price))
      .toFixed(2)

    const distributionRate =
      currentEpochMetadataQuery.data.distributionRateByStakingContract[
        getStakingContract(stakingAssetId)
      ]

    return bn(affiliateRevenueUserCurrency).times(distributionRate).toFixed(2)
  }, [
    affiliateRevenueQuery.data,
    currentEpochMetadataQuery.data,
    runeAsset?.precision,
    runeAssetMarketData?.price,
    stakingAssetId,
  ])

  return (
    <StatItem
      description={translate('RFOX.emissionsPool', { symbol: stakingAsset?.symbol })}
      helperDescription={translate('RFOX.emissionsPoolHelper', { symbol: stakingAsset?.symbol })}
      amountUserCurrency={emissionsPoolUserCurrency}
      isLoading={affiliateRevenueQuery.isLoading || currentEpochMetadataQuery.isLoading}
    />
  )
}
