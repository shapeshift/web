import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAccountId, thorchainAssetId } from '@shapeshiftoss/caip'
import { BigAmount } from '@shapeshiftoss/utils'
import { useCallback, useMemo } from 'react'
import { getAddress } from 'viem'

import { RFOX_V3_UPGRADE_EPOCH } from '../constants'
import { getRfoxStakingConfig, getStakingContract } from '../helpers'
import type { Epoch } from '../types'
import { useEpochHistoryQuery } from './useEpochHistoryQuery'

import { bn } from '@/lib/bignumber/bignumber'
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
  const rewardAssetId = useMemo(
    () => getRfoxStakingConfig(stakingAssetId).rewardAssetId,
    [stakingAssetId],
  )

  const runeAsset = useAppSelector(state => selectAssetById(state, thorchainAssetId))
  const rewardAsset = useAppSelector(state => selectAssetById(state, rewardAssetId))

  const runeMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, thorchainAssetId),
  )
  const rewardAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, rewardAssetId),
  )

  const select = useCallback(
    (data: Epoch[]): string => {
      if (!stakingAssetAccountId) return '0'
      if (!runeAsset || !runeMarketData) return '0'
      if (!rewardAsset || !rewardAssetMarketData) return '0'

      const { account: stakingAddress } = fromAccountId(stakingAssetAccountId)

      const lifetimeRewardsUserCurrency = data.reduce((acc, epoch) => {
        const distribution =
          epoch.detailsByStakingContract[getStakingContract(stakingAssetId)]
            ?.distributionsByStakingAddress[getAddress(stakingAddress)]

        if (!distribution) return acc

        // filter out genesis "distributions"
        if (epoch.distributionStatus === 'complete' && !distribution.txId) return acc

        const epochRewardUserCurrency = (() => {
          // rFOX v3 updated rewards from rune to a stable, which varies by staking contract
          if (epoch.number >= RFOX_V3_UPGRADE_EPOCH) {
            return BigAmount.fromBaseUnit({
              value: distribution.amount,
              precision: rewardAsset?.precision ?? 0,
            })
              .toBN()
              .times(rewardAssetMarketData.price)
          }

          return BigAmount.fromBaseUnit({
            value: distribution.amount,
            precision: runeAsset?.precision ?? 0,
          })
            .toBN()
            .times(runeMarketData.price)
        })()

        return acc.plus(epochRewardUserCurrency)
      }, bn(0))

      return lifetimeRewardsUserCurrency.toFixed(2)
    },
    [
      stakingAssetId,
      stakingAssetAccountId,
      runeAsset,
      runeMarketData,
      rewardAsset,
      rewardAssetMarketData,
    ],
  )

  const query = useEpochHistoryQuery({
    select,
    enabled: !!stakingAssetAccountId,
  })

  return query
}
