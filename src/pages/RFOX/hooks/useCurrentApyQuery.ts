import { foxAssetId, thorchainAssetId } from '@shapeshiftoss/caip'
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

/**
 * Get the estimated APY of RFOX
 */
export const useCurrentApyQuery = () => {
  useFetchPriceHistories([thorchainAssetId, foxAssetId], HistoryTimeframe.MONTH)

  const runePriceHistory = useAppSelector(state =>
    selectPriceHistoryByAssetTimeframe(state, thorchainAssetId, HistoryTimeframe.MONTH),
  )
  const foxPriceHistory = useAppSelector(state =>
    selectPriceHistoryByAssetTimeframe(state, foxAssetId, HistoryTimeframe.MONTH),
  )

  const runeAsset = useAppSelector(state => selectAssetById(state, thorchainAssetId))
  const foxAsset = useAppSelector(state => selectAssetById(state, foxAssetId))

  const totalStakedCryptoCurrencyResult = useTotalStakedQuery<string>({
    select: (totalStaked: bigint) => {
      return totalStaked.toString()
    },
  })

  const select = useCallback(
    (data: EpochWithIpfsHash[]): string | undefined => {
      if (!runePriceHistory) return
      if (!foxPriceHistory) return
      if (!runeAsset) return
      if (!foxAsset) return
      if (!totalStakedCryptoCurrencyResult?.data) return

      const previousEpoch = data[data.length - 1]

      const closestRunePrice = runePriceHistory.find(
        (price, index) =>
          price.date <= previousEpoch.endTimestamp &&
          runePriceHistory[index + 1]?.date > previousEpoch.endTimestamp,
      )

      const closestFoxPrice = foxPriceHistory.find(
        (price, index) =>
          price.date <= previousEpoch.endTimestamp &&
          runePriceHistory[index + 1]?.date > previousEpoch.endTimestamp,
      )

      const totalRuneFiatValue = bnOrZero(
        fromBaseUnit(previousEpoch.totalRevenue, runeAsset.precision),
      )
        .times(previousEpoch.distributionRate)
        .times(closestRunePrice?.price ?? 0)

      const totalFoxFiatValue = bnOrZero(
        fromBaseUnit(totalStakedCryptoCurrencyResult.data, foxAsset.precision),
      ).times(closestFoxPrice?.price ?? 0)

      const estimatedApy = totalRuneFiatValue.dividedBy(totalFoxFiatValue).times(12).toFixed(4)

      return estimatedApy
    },
    [runePriceHistory, foxPriceHistory, runeAsset, foxAsset, totalStakedCryptoCurrencyResult],
  )

  const query = useEpochHistoryQuery({ select })

  return query
}
