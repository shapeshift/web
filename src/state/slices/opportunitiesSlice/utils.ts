import type { Asset } from '@shapeshiftoss/asset-service'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { toAssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/investor-foxy'
import type { MarketData } from '@shapeshiftoss/types'
import { fromBaseUnit } from 'lib/math'

import { STAKING_ID_DELIMITER } from './constants'
import type { OpportunityId, OpportunityMetadataBase, StakingId, UserStakingId } from './types'

export type UserStakingIdParts = [accountId: AccountId, stakingId: StakingId]

export const deserializeUserStakingId = (userStakingId: UserStakingId): UserStakingIdParts => {
  const parts = userStakingId.split(STAKING_ID_DELIMITER)

  const [accountId, stakingId] = parts

  if (!(accountId && stakingId)) throw new Error('Error deserializing UserStakingId')

  return [accountId, stakingId]
}

export const serializeUserStakingId = (
  ...[accountId, stakingId]: UserStakingIdParts
): UserStakingId => `${accountId}${STAKING_ID_DELIMITER}${stakingId}`

export const filterUserStakingIdByStakingIdCompareFn = (
  userStakingId: UserStakingId,
  stakingId: StakingId,
) => {
  const parts = deserializeUserStakingId(userStakingId)
  const [, deserializedStakingId] = parts

  return deserializedStakingId === stakingId
}

export const toOpportunityId = (...[args]: Parameters<typeof toAssetId>) =>
  toAssetId(args) as OpportunityId

type getUnderlyingAssetIdsBalancesProps = {
  cryptoAmountBaseUnit: string
  assets: Partial<Record<AssetId, Asset>>
  marketData: Partial<Record<AssetId, MarketData>>
} & Pick<OpportunityMetadataBase, 'underlyingAssetRatiosBaseUnit' | 'underlyingAssetIds'>

export const getUnderlyingAssetIdsBalances = ({
  underlyingAssetIds,
  underlyingAssetRatiosBaseUnit,
  cryptoAmountBaseUnit,
  assets,
  marketData,
}: getUnderlyingAssetIdsBalancesProps) => {
  return Object.values(underlyingAssetIds).reduce(
    (
      acc: { [key: string]: { fiatAmount: string; cryptoBalancePrecision: string } },
      assetId,
      index,
    ) => {
      const asset = assets[assetId]
      const marketDataPrice = marketData[assetId]?.price
      if (asset) {
        acc[assetId] = {
          fiatAmount: bnOrZero(cryptoAmountBaseUnit)
            .times(fromBaseUnit(underlyingAssetRatiosBaseUnit[index], asset.precision))
            .div(bnOrZero(10).pow(asset?.precision))
            .times(marketDataPrice ?? 0)
            .toString(),
          cryptoBalancePrecision: bnOrZero(cryptoAmountBaseUnit)
            .times(fromBaseUnit(underlyingAssetRatiosBaseUnit[index], asset.precision))
            .div(bnOrZero(10).pow(asset?.precision))
            .toString(),
        }
      }
      return acc
    },
    {},
  )
}
