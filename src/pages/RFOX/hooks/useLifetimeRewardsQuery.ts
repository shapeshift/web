import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAccountId, thorchainAssetId, usdcOnArbitrumOneAssetId } from '@shapeshiftoss/caip'
import { BigAmount, bn } from '@shapeshiftoss/utils'
import { useCallback } from 'react'
import { getAddress } from 'viem'

import { RFOX_V3_UPGRADE_EPOCH } from '../constants'
import { getStakingContract } from '../helpers'
import type { Epoch } from '../types'
import { useEpochHistoryQuery } from './useEpochHistoryQuery'

import { selectAssetById, selectMarketDataByAssetIdUserCurrency } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type UseLifetimeRewardsQueryProps = {
  stakingAssetId: AssetId
  stakingAssetAccountId: AccountId | undefined
}

/**
 * Gets the lifetime rewards in user currency for a given account address, excluding the current epoch.
 */
export const useLifetimeRewardsUserCurrencyQuery = ({
  stakingAssetId,
  stakingAssetAccountId,
}: UseLifetimeRewardsQueryProps) => {
  const runeAsset = useAppSelector(state => selectAssetById(state, thorchainAssetId))
  const usdcAsset = useAppSelector(state => selectAssetById(state, usdcOnArbitrumOneAssetId))

  const runeMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, thorchainAssetId),
  )
  const usdcMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, usdcOnArbitrumOneAssetId),
  )

  const select = useCallback(
    (data: Epoch[]): string => {
      if (!stakingAssetAccountId) return '0'
      if (!runeAsset || !runeMarketData) return '0'
      if (!usdcAsset || !usdcMarketData) return '0'

      const { account: stakingAddress } = fromAccountId(stakingAssetAccountId)

      const lifetimeRewardsUserCurrency = data.reduce((acc, epoch) => {
        const distribution =
          epoch.detailsByStakingContract[getStakingContract(stakingAssetId)]
            ?.distributionsByStakingAddress[getAddress(stakingAddress)]

        if (!distribution) return acc

        // filter out genesis "distributions"
        if (epoch.distributionStatus === 'complete' && !distribution.txId) return acc

        const epochRewardUserCurrency = (() => {
          // rFOX v3 updated rewards from rune to usdc
          if (epoch.number >= RFOX_V3_UPGRADE_EPOCH) {
            return bn(
              BigAmount.fromBaseUnit({
                value: distribution.amount,
                precision: usdcAsset?.precision ?? 0,
              }).toPrecision(),
            ).times(usdcMarketData.price)
          }

          return bn(
            BigAmount.fromBaseUnit({
              value: distribution.amount,
              precision: runeAsset?.precision ?? 0,
            }).toPrecision(),
          ).times(runeMarketData.price)
        })()

        return acc.plus(epochRewardUserCurrency)
      }, bn(0))

      return lifetimeRewardsUserCurrency.toFixed(2)
    },
    [stakingAssetId, stakingAssetAccountId, runeAsset, runeMarketData, usdcAsset, usdcMarketData],
  )

  const query = useEpochHistoryQuery({
    select,
    enabled: !!stakingAssetAccountId,
  })

  return query
}
