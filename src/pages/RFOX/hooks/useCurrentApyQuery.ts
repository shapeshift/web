import type { AssetId } from '@shapeshiftoss/caip'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import { bnOrZero } from '@shapeshiftoss/utils'
import { useCallback } from 'react'
import { useFetchPriceHistories } from 'hooks/useFetchPriceHistories/useFetchPriceHistories'
import { fromBaseUnit } from 'lib/math'
import { selectAssetById, selectPriceHistoryByAssetTimeframe } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type { EpochWithIpfsHash } from './useEpochHistoryQuery'
import { useEpochHistoryQuery } from './useEpochHistoryQuery'
import { useTotalStakedQuery } from './useGetTotalStaked'

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

  const totalStakedCryptoCurrencyResult = useTotalStakedQuery<string>({
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
      if (!totalStakedCryptoCurrencyResult?.data) return

      const previousEpoch = epochs[epochs.length - 1]

      const closestRunePrice = runePriceHistory.find(
        (price, index) =>
          price.date <= previousEpoch.endTimestamp &&
          runePriceHistory[index + 1]?.date > previousEpoch.endTimestamp,
      )

      const closestFoxPrice = stakingAssetPriceHistory.find(
        (price, index) =>
          price.date <= previousEpoch.endTimestamp &&
          runePriceHistory[index + 1]?.date > previousEpoch.endTimestamp,
      )

      const totalRuneUsdValue = bnOrZero(
        fromBaseUnit(previousEpoch.totalRevenue, runeAsset.precision),
      )
        .times(previousEpoch.distributionRate)
        .times(closestRunePrice?.price ?? 0)

      const totalFoxUsdValue = bnOrZero(
        fromBaseUnit(totalStakedCryptoCurrencyResult.data, stakingAsset.precision),
      ).times(closestFoxPrice?.price ?? 0)

      const estimatedApy = totalRuneUsdValue.dividedBy(totalFoxUsdValue).times(12).toFixed(4)

      return estimatedApy
    },
    [
      runePriceHistory,
      stakingAssetPriceHistory,
      runeAsset,
      stakingAsset,
      totalStakedCryptoCurrencyResult,
    ],
  )

  const query = useEpochHistoryQuery({ select })

  return query
}
