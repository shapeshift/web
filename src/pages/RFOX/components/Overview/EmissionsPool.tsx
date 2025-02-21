import type { AssetId } from '@shapeshiftmonorepo/caip'
import { thorchainAssetId } from '@shapeshiftmonorepo/caip'
import { bn } from '@shapeshiftmonorepo/chain-adapters'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { fromBaseUnit } from 'lib/math'

import { StatItem } from './StatItem'

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

  const affiliateRevenueQuery = useAffiliateRevenueQuery<string>({
    startTimestamp: currentEpochMetadataQuery.data?.epochStartTimestamp,
    endTimestamp: currentEpochMetadataQuery.data?.epochEndTimestamp,
    select: (totalRevenue: bigint) => {
      return bn(fromBaseUnit(totalRevenue.toString(), runeAsset?.precision ?? 0))
        .times(runeAssetMarketData.price)
        .toFixed(2)
    },
  })

  const emissionsPoolUserCurrency = useMemo(() => {
    if (!affiliateRevenueQuery.data) return
    if (!currentEpochMetadataQuery.data) return

    const distributionRate =
      currentEpochMetadataQuery.data.distributionRateByStakingContract[
        getStakingContract(stakingAssetId)
      ]

    return bn(affiliateRevenueQuery.data).times(distributionRate).toFixed(2)
  }, [affiliateRevenueQuery, currentEpochMetadataQuery, stakingAssetId])

  return (
    <StatItem
      description={translate('RFOX.emissionsPool', { symbol: stakingAsset?.symbol })}
      helperDescription={translate('RFOX.emissionsPoolHelper', { symbol: stakingAsset?.symbol })}
      amountUserCurrency={emissionsPoolUserCurrency}
      isLoading={affiliateRevenueQuery.isLoading || currentEpochMetadataQuery.isLoading}
    />
  )
}
