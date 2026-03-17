import type { AssetId } from '@shapeshiftoss/caip'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import { BigAmount } from '@shapeshiftoss/utils'
import { useCallback } from 'react'

import { getStakingContract } from '../helpers'
import type { EpochWithIpfsHash } from './useEpochHistoryQuery'
import { useEpochHistoryQuery } from './useEpochHistoryQuery'
import { useTotalStakedQuery } from './useGetTotalStaked'

import { useFetchPriceHistories } from '@/hooks/useFetchPriceHistories/useFetchPriceHistories'
import { bn } from '@/lib/bignumber/bignumber'
import { selectAssetById, selectPriceHistoryByAssetTimeframe } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type useCurrentApyQueryProps = {
  stakingAssetId: AssetId
}

/**
 * Get the estimated APY of RFOX
 */
export const useCurrentApyQuery = ({ stakingAssetId }: useCurrentApyQueryProps) => {
  useFetchPriceHistories([stakingAssetId], HistoryTimeframe.MONTH)

  const stakingAssetPriceHistory = useAppSelector(state =>
    selectPriceHistoryByAssetTimeframe(state, stakingAssetId, HistoryTimeframe.MONTH),
  )

  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))

  const totalStakedCryptoCurrencyQuery = useTotalStakedQuery<string>({
    stakingAssetId,
    select: (totalStaked: bigint) => {
      return totalStaked.toString()
    },
  })

  const select = useCallback(
    (epochs: EpochWithIpfsHash[]): string | undefined => {
      if (!stakingAssetPriceHistory) return
      if (!stakingAsset) return
      if (!totalStakedCryptoCurrencyQuery?.data) return
      if (!epochs.length) return

      const latestEpoch = epochs[0]

      const distributionRate =
        latestEpoch.detailsByStakingContract[getStakingContract(stakingAsset.assetId)]
          .distributionRate

      const closestStakingAssetPrice =
        stakingAssetPriceHistory.findLast(price => price.date <= latestEpoch.endTimestamp) ??
        stakingAssetPriceHistory[0]

      const rewardDistributionUsd = bn(latestEpoch.totalRevenue).times(distributionRate)

      const totalStakedUsd = BigAmount.fromBaseUnit({
        value: totalStakedCryptoCurrencyQuery.data,
        precision: stakingAsset.precision,
      })
        .toBN()
        .times(closestStakingAssetPrice.price)

      return rewardDistributionUsd.div(totalStakedUsd).times(12).toFixed(4)
    },
    [stakingAssetPriceHistory, stakingAsset, totalStakedCryptoCurrencyQuery],
  )

  const query = useEpochHistoryQuery({ select })

  return query
}
