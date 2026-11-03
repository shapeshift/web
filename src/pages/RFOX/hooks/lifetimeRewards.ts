import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { BigAmount, bn } from '@shapeshiftoss/utils'
import { getAddress } from 'viem'

import { RFOX_STAKING_CONFIG } from '../constants'
import { getRewardAssetId } from '../helpers'
import type { Epoch } from '../types'

type RewardPricing = Record<AssetId, { precision: number; price: string } | undefined>

export const calculateLifetimeRewards = (
  epochs: Epoch[],
  accountIdsByChainId: Partial<Record<ChainId, AccountId>>,
  pricing: RewardPricing,
): string => {
  return epochs
    .reduce((total, epoch) => {
      return Object.entries(RFOX_STAKING_CONFIG).reduce((subtotal, [stakingAssetId, config]) => {
        const accountId = accountIdsByChainId[config.chainId]
        if (!accountId) return subtotal

        const address = getAddress(fromAccountId(accountId).account)
        const distribution =
          epoch.detailsByStakingContract[config.stakingContract]?.distributionsByStakingAddress[
            address
          ]
        if (!distribution || bn(distribution.amount).isZero()) return subtotal
        if (epoch.distributionStatus === 'complete' && !distribution.txId) return subtotal

        const rewardPricing = pricing[getRewardAssetId(stakingAssetId, epoch.number)]
        if (
          !rewardPricing ||
          !bn(rewardPricing.price).isFinite() ||
          bn(rewardPricing.price).lte(0)
        ) {
          throw new Error('Reward pricing unavailable')
        }

        return subtotal.plus(
          BigAmount.fromBaseUnit({
            value: distribution.amount,
            precision: rewardPricing.precision,
          })
            .toBN()
            .times(rewardPricing.price),
        )
      }, total)
    }, bn(0))
    .toFixed(2)
}
