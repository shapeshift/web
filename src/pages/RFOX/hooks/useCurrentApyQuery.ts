import type { AssetId } from '@shapeshiftoss/caip'
import { BigAmount } from '@shapeshiftoss/utils'
import { useCallback, useMemo } from 'react'

import { getStakingContract } from '../helpers'
import { useAffiliateRevenueUsdQuery } from './useAffiliateRevenueUsdQuery'
import { useCurrentEpochMetadataQuery } from './useCurrentEpochMetadataQuery'
import { useTotalStakedQuery } from './useGetTotalStaked'

import { bn } from '@/lib/bignumber/bignumber'
import { selectAssetById, selectUsdRateByAssetId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const MS_PER_DAY = 24 * 60 * 60 * 1000
const TRAILING_REVENUE_DAYS = 30
const DAYS_PER_YEAR = 365

type useCurrentApyQueryProps = {
  stakingAssetId: AssetId
}

/**
 * Get the estimated APY of RFOX from the revenue of the last 30 complete days
 */
export const useCurrentApyQuery = ({ stakingAssetId }: useCurrentApyQueryProps) => {
  const stakingAssetUsdRate = useAppSelector(state => selectUsdRateByAssetId(state, stakingAssetId))

  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))

  const currentEpochMetadataQuery = useCurrentEpochMetadataQuery()

  const totalStakedCryptoCurrencyQuery = useTotalStakedQuery<string>({
    stakingAssetId,
    select: (totalStaked: bigint) => {
      return totalStaked.toString()
    },
  })

  const { startTimestamp, endTimestamp } = useMemo(() => {
    const startOfToday = Math.floor(Date.now() / MS_PER_DAY) * MS_PER_DAY

    return {
      startTimestamp: startOfToday - TRAILING_REVENUE_DAYS * MS_PER_DAY,
      endTimestamp: startOfToday - 1,
    }
  }, [])

  const select = useCallback(
    (trailingRevenueUsd: number): string | undefined => {
      if (!stakingAssetUsdRate) return
      if (!stakingAsset) return
      if (!totalStakedCryptoCurrencyQuery?.data) return
      if (!currentEpochMetadataQuery.data) return

      const distributionRate =
        currentEpochMetadataQuery.data.distributionRateByStakingContract[
          getStakingContract(stakingAsset.assetId)
        ] ?? 0

      const rewardDistributionUsd = bn(trailingRevenueUsd).times(distributionRate)

      const totalStakedUsd = BigAmount.fromBaseUnit({
        value: totalStakedCryptoCurrencyQuery.data,
        precision: stakingAsset.precision,
      })
        .toBN()
        .times(stakingAssetUsdRate)

      // A program with a distribution rate but nothing staked yet has no apy to report
      if (totalStakedUsd.isZero()) return

      return rewardDistributionUsd
        .div(totalStakedUsd)
        .times(DAYS_PER_YEAR / TRAILING_REVENUE_DAYS)
        .toFixed(4)
    },
    [
      stakingAssetUsdRate,
      stakingAsset,
      totalStakedCryptoCurrencyQuery,
      currentEpochMetadataQuery.data,
    ],
  )

  return useAffiliateRevenueUsdQuery({ startTimestamp, endTimestamp, select })
}
