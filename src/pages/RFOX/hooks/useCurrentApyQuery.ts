import type { AssetId } from '@shapeshiftoss/caip'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import { bnOrZero } from '@shapeshiftoss/utils'
import { useCallback } from 'react'

import { getStakingContract } from '../helpers'
import type { EpochWithIpfsHash } from './useEpochHistoryQuery'
import { useEpochHistoryQuery } from './useEpochHistoryQuery'
import { useTotalStakedQuery } from './useGetTotalStaked'

import { useFetchPriceHistories } from '@/hooks/useFetchPriceHistories/useFetchPriceHistories'
import { fromBaseUnit } from '@/lib/math'
import { selectAssetById, selectPriceHistoryByAssetTimeframe } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type useCurrentApyQueryProps = {
  stakingAssetId: AssetId
}

/**
 * Get the estimated APY of RFOX
 */
export const useCurrentApyQuery = ({ stakingAssetId }: useCurrentApyQueryProps) => {
  useFetchPriceHistories([thorchainAssetId, stakingAssetId], HistoryTimeframe.MONTH)

  const runePriceHistory = useAppSelector(state =>
    selectPriceHistoryByAssetTimeframe(state, thorchainAssetId, HistoryTimeframe.MONTH),
  )
  const stakingAssetPriceHistory = useAppSelector(state =>
    selectPriceHistoryByAssetTimeframe(state, stakingAssetId, HistoryTimeframe.MONTH),
  )

  const runeAsset = useAppSelector(state => selectAssetById(state, thorchainAssetId))
  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))

  const totalStakedCryptoCurrencyQuery = useTotalStakedQuery<string>({
    stakingAssetId,
    select: (totalStaked: bigint) => {
      return totalStaked.toString()
    },
  })

  const select = useCallback(
    (epochs: EpochWithIpfsHash[]): string | undefined => {
      if (!runePriceHistory) return
      if (!stakingAssetPriceHistory) return
      if (!runeAsset) return
      if (!stakingAsset) return
      if (!totalStakedCryptoCurrencyQuery?.data) return

      const latestEpoch = epochs[0]

      const distributionRate =
        latestEpoch.detailsByStakingContract[getStakingContract(stakingAsset.assetId)]
          .distributionRate

      const closestRunePrice =
        runePriceHistory.findLast(price => price.date <= latestEpoch.endTimestamp) ??
        runePriceHistory[0]

      const closestStakingAssetPrice =
        stakingAssetPriceHistory.findLast(price => price.date <= latestEpoch.endTimestamp) ??
        stakingAssetPriceHistory[0]

      const rewardDistributionUsd = bnOrZero(
        fromBaseUnit(latestEpoch.totalRevenue, runeAsset.precision),
      )
        .times(distributionRate)
        .times(closestRunePrice.price)

      const totalStakedUsd = bnOrZero(
        fromBaseUnit(totalStakedCryptoCurrencyQuery.data, stakingAsset.precision),
      ).times(closestStakingAssetPrice.price)

      return rewardDistributionUsd.dividedBy(totalStakedUsd).times(12).toFixed(4)
    },
    [
      runePriceHistory,
      stakingAssetPriceHistory,
      runeAsset,
      stakingAsset,
      totalStakedCryptoCurrencyQuery,
    ],
  )

  const query = useEpochHistoryQuery({ select })

  return query
}
