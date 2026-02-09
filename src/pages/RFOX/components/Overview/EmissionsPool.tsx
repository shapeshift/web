import type { AssetId } from '@shapeshiftoss/caip'
import { bn } from '@shapeshiftoss/chain-adapters'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { StatItem } from './StatItem'

import { getStakingContract } from '@/pages/RFOX/helpers'
import { useAffiliateRevenueUsdQuery } from '@/pages/RFOX/hooks/useAffiliateRevenueUsdQuery'
import { useCurrentEpochMetadataQuery } from '@/pages/RFOX/hooks/useCurrentEpochMetadataQuery'
import { selectAssetById, selectUserCurrencyToUsdRate } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type EmissionsPoolProps = {
  stakingAssetId: AssetId
}

export const EmissionsPool: React.FC<EmissionsPoolProps> = ({ stakingAssetId }) => {
  const translate = useTranslate()

  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))
  const userCurrencyToUsdRate = useAppSelector(selectUserCurrencyToUsdRate)

  const currentEpochMetadataQuery = useCurrentEpochMetadataQuery()

  const affiliateRevenueUsdQuery = useAffiliateRevenueUsdQuery<string>({
    startTimestamp: currentEpochMetadataQuery.data?.epochStartTimestamp,
    endTimestamp: currentEpochMetadataQuery.data?.epochEndTimestamp,
  })

  const emissionsPoolUserCurrency = useMemo(() => {
    if (!affiliateRevenueUsdQuery.data) return
    if (!currentEpochMetadataQuery.data) return

    const distributionRate =
      currentEpochMetadataQuery.data.distributionRateByStakingContract[
        getStakingContract(stakingAssetId)
      ]

    return bn(affiliateRevenueUsdQuery.data)
      .times(userCurrencyToUsdRate)
      .times(distributionRate)
      .toFixed(2)
  }, [
    affiliateRevenueUsdQuery.data,
    currentEpochMetadataQuery.data,
    stakingAssetId,
    userCurrencyToUsdRate,
  ])

  return (
    <StatItem
      description={translate('RFOX.emissionsPool', { symbol: stakingAsset?.symbol })}
      helperDescription={translate('RFOX.emissionsPoolHelper', { symbol: stakingAsset?.symbol })}
      amountUserCurrency={emissionsPoolUserCurrency}
      isLoading={affiliateRevenueUsdQuery.isLoading || currentEpochMetadataQuery.isLoading}
    />
  )
}
