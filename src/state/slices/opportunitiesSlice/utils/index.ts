import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  fromAccountId,
  fromAssetId,
  thorchainAssetId,
  toAccountId,
  toAssetId,
} from '@shapeshiftoss/caip'
import type { Asset, MarketData } from '@shapeshiftoss/types'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'

import { foxEthAssetIds, STAKING_ID_DELIMITER } from '../constants'
import type {
  CosmosSdkStakingSpecificUserStakingOpportunity,
  UserUndelegation,
} from '../resolvers/cosmosSdk/types'
import type { FoxySpecificUserStakingOpportunity } from '../resolvers/foxy/types'
import type {
  OpportunityId,
  OpportunityMetadataBase,
  RunepoolUserStakingOpportunity,
  StakingEarnOpportunityType,
  StakingId,
  UserStakingId,
  UserStakingOpportunity,
  UserStakingOpportunityWithMetadata,
  ValidatorId,
} from '../types'
import { DefiProvider, DefiType } from '../types'

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

// An OpportunityId as an AssetId, i.e any chain where the opportunity is an Asset
// That may be a L1 AssetId (THOR savers), or a smart contract account, which for all intent and purposes is an ERC20 i.e an asset
export const toOpportunityId = (...[args]: Parameters<typeof toAssetId>) =>
  toAssetId(args) as OpportunityId

export const opportunityIdToChainId = (opportunityId: OpportunityId): ChainId => {
  // an OpportunityId can be an AssetId or AccountId, try fromAssetId first, and if it throws
  // it's an AccountId
  try {
    const { chainId } = fromAssetId(opportunityId)
    return chainId
  } catch (e) {
    // we're pretty confident it's an AccountId now
    const { chainId } = fromAccountId(opportunityId)
    return chainId
  }
}

type GetUnderlyingAssetIdsBalancesArgs = {
  assetId: AssetId
  cryptoAmountBaseUnit: string
  assets: Partial<Record<AssetId, Asset>>
  marketDataUserCurrency: Partial<Record<AssetId, MarketData>>
} & Pick<OpportunityMetadataBase, 'underlyingAssetRatiosBaseUnit' | 'underlyingAssetIds'>

export type UnderlyingAssetIdsBalances = { fiatAmount: string; cryptoBalancePrecision: string }
type GetUnderlyingAssetIdsBalancesReturn = Record<AssetId, UnderlyingAssetIdsBalances>

type GetUnderlyingAssetIdsBalances = (
  args: GetUnderlyingAssetIdsBalancesArgs,
) => GetUnderlyingAssetIdsBalancesReturn

export const getUnderlyingAssetIdsBalances: GetUnderlyingAssetIdsBalances = ({
  underlyingAssetIds,
  underlyingAssetRatiosBaseUnit,
  cryptoAmountBaseUnit,
  assets,
  assetId,
  marketDataUserCurrency,
}) => {
  return Object.values(underlyingAssetIds).reduce<GetUnderlyingAssetIdsBalancesReturn>(
    (acc, underlyingAssetId, index) => {
      const underlyingAsset = assets[underlyingAssetId]
      const asset = assets[assetId ?? '']
      const marketDataPrice = marketDataUserCurrency[underlyingAssetId]?.price

      if (!(underlyingAsset && asset)) {
        acc[underlyingAssetId] = {
          fiatAmount: '0',
          cryptoBalancePrecision: '0',
        }
        return acc
      }

      const cryptoBalancePrecision = bnOrZero(cryptoAmountBaseUnit)
        .times(fromBaseUnit(underlyingAssetRatiosBaseUnit[index], underlyingAsset.precision))
        .div(bnOrZero(10).pow(asset.precision))

      const fiatAmount = cryptoBalancePrecision.times(marketDataPrice ?? 0).toString()
      acc[underlyingAssetId] = {
        fiatAmount,
        cryptoBalancePrecision: cryptoBalancePrecision.toFixed(),
      }
      return acc
    },
    {},
  )
}
type GetRewardBalancesArgs = {
  assets: Partial<Record<AssetId, Asset>>
  marketDataUserCurrency: Partial<Record<AssetId, MarketData>>
} & Pick<StakingEarnOpportunityType, 'rewardAssetIds' | 'rewardsCryptoBaseUnit'>

type GetRewardBalances = (args: GetRewardBalancesArgs) => GetUnderlyingAssetIdsBalancesReturn
export const getRewardBalances: GetRewardBalances = ({
  rewardsCryptoBaseUnit,
  rewardAssetIds,
  assets,
  marketDataUserCurrency,
}) => {
  if (!rewardAssetIds) return {}
  return Array.from(rewardAssetIds).reduce<GetUnderlyingAssetIdsBalancesReturn>(
    (acc, assetId, index) => {
      const rewardAsset = assets[assetId]
      if (!rewardAsset) return acc
      const marketDataPrice = bnOrZero(marketDataUserCurrency[assetId]?.price)
      const cryptoBalancePrecision = bnOrZero(rewardsCryptoBaseUnit?.amounts[index])
        .div(bn(10).pow(rewardAsset?.precision))
        .toString()
      const fiatAmount = bnOrZero(cryptoBalancePrecision).times(marketDataPrice).toString()
      acc[assetId] = {
        fiatAmount,
        cryptoBalancePrecision,
      }
      return acc
    },
    {},
  )
}
// An OpportunityId as a ValidatorId
// Currently used with Cosmos SDK opportunities, where the opportunity is a validator, e.g an Address
// Since AccountId is generally used to represent portfolio accounts and not other, arbitrary on-chain accounts, we give this some flavour
export const toValidatorId = (...[args]: Parameters<typeof toAccountId>) =>
  toAccountId(args) as ValidatorId

export const supportsUndelegations = (
  userStakingOpportunity: Partial<UserStakingOpportunity>,
): userStakingOpportunity is
  | CosmosSdkStakingSpecificUserStakingOpportunity
  | FoxySpecificUserStakingOpportunity => 'undelegations' in userStakingOpportunity

export const makeTotalUndelegationsCryptoBaseUnit = (undelegations: UserUndelegation[]) =>
  undelegations.reduce((a, { undelegationAmountCryptoBaseUnit: b }) => a.plus(b), bn(0))

export const isActiveStakingOpportunity = (
  userStakingOpportunity: UserStakingOpportunity | UserStakingOpportunityWithMetadata,
) => {
  const hasActiveStaking = bn(userStakingOpportunity.stakedAmountCryptoBaseUnit).gt(0)
  const hasRewards = userStakingOpportunity.rewardsCryptoBaseUnit.amounts.some(rewardsAmount =>
    bn(rewardsAmount).gt(0),
  )
  // Defaults to 0 for non-Cosmos-Sdk opportunities
  const hasActiveUndelegations = makeTotalUndelegationsCryptoBaseUnit([
    ...(supportsUndelegations(userStakingOpportunity) ? userStakingOpportunity.undelegations : []),
  ]).gt(0)

  return hasActiveStaking || hasRewards || hasActiveUndelegations
}

export const isActiveStakingEarnOpportunity = (
  earnUserStakingOpportunity: StakingEarnOpportunityType,
): boolean => isActiveStakingOpportunity(earnUserStakingOpportunity as UserStakingOpportunity)
export const isFoxEthStakingAssetId = (assetId: AssetId) => foxEthAssetIds.includes(assetId)

// Returns either
// - underlying asset icons
// - opportunity metadata icon e.g the Cosmos SDK validator icon
export const makeOpportunityIcons = ({
  opportunity,
  assets,
}: {
  opportunity: OpportunityMetadataBase | UserStakingOpportunityWithMetadata
  assets: Partial<Record<AssetId, Asset>>
}) =>
  opportunity.icon
    ? [opportunity.icon]
    : opportunity.underlyingAssetIds.map(assetId => assets[assetId]?.icon).map(icon => icon ?? '')

type MakeDefiProviderDisplayNameArgs = {
  provider: string
  assetName: string
}

type MakeDefiProviderDisplayName = (args: MakeDefiProviderDisplayNameArgs) => string

export const makeDefiProviderDisplayName: MakeDefiProviderDisplayName = ({
  provider,
  assetName,
}) => {
  switch (provider) {
    case DefiProvider.CosmosSdk:
      return assetName
    default:
      return provider
  }
}
type GetOpportunityAccessorArgs = { provider: string; type: DefiType }
type GetOpportunityAccessorReturn = 'underlyingAssetId' | 'underlyingAssetIds'
type GetOpportunityAccessor = (args: GetOpportunityAccessorArgs) => GetOpportunityAccessorReturn

export const getOpportunityAccessor: GetOpportunityAccessor = ({ provider, type }) => {
  if (type === DefiType.Staking) {
    if (provider === DefiProvider.EthFoxStaking || provider === DefiProvider.rFOX) {
      return 'underlyingAssetId'
    }
  }
  return 'underlyingAssetIds'
}

export const isRunePoolUserStakingOpportunity = (
  opportunity: StakingEarnOpportunityType | undefined,
): opportunity is StakingEarnOpportunityType & RunepoolUserStakingOpportunity => {
  return Boolean(
    opportunity &&
      opportunity.provider === DefiProvider.ThorchainSavers &&
      opportunity.id === thorchainAssetId,
  )
}
