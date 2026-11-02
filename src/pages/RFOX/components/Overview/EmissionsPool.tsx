import type { AssetId } from '@shapeshiftoss/caip'
import { bn } from '@shapeshiftoss/chain-adapters'
import { useCallback, useMemo } from 'react'
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

  const affiliateRevenueUsdQuery = useAffiliateRevenueUsdQuery({
    startTimestamp: currentEpochMetadataQuery.data?.epochStartTimestamp,
    endTimestamp: currentEpochMetadataQuery.data?.epochEndTimestamp,
  })

  const emissionsPoolUserCurrency = useMemo(() => {
    if (affiliateRevenueUsdQuery.data === undefined) return
    if (!currentEpochMetadataQuery.data) return

    const distributionRate =
      currentEpochMetadataQuery.data.distributionRateByStakingContract[
        getStakingContract(stakingAssetId)
      ] ?? 0

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

  const handleRetry = useCallback(() => {
    if (
      currentEpochMetadataQuery.isError ||
      !currentEpochMetadataQuery.data?.epochStartTimestamp ||
      !currentEpochMetadataQuery.data?.epochEndTimestamp
    ) {
      void currentEpochMetadataQuery.refetch({ cancelRefetch: false })
    }
    if (affiliateRevenueUsdQuery.isError) {
      void affiliateRevenueUsdQuery.refetch({ cancelRefetch: false })
    }
  }, [currentEpochMetadataQuery, affiliateRevenueUsdQuery])

  const isError = currentEpochMetadataQuery.isError || affiliateRevenueUsdQuery.isError
  const isLoading = currentEpochMetadataQuery.isLoading || affiliateRevenueUsdQuery.isLoading

  return (
    <StatItem
      description={translate('RFOX.emissionsPool', { symbol: stakingAsset?.symbol })}
      helperDescription={translate('RFOX.emissionsPoolHelper', { symbol: stakingAsset?.symbol })}
      amountUserCurrency={emissionsPoolUserCurrency}
      isLoading={isLoading}
      isError={isError}
      onRetry={handleRetry}
    />
  )
}
