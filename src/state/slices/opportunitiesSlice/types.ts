import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import type { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import type { EarnOpportunityType } from 'features/defi/helpers/normalizeOpportunity'
import type { PartialRecord } from 'lib/utils'
import type { Nominal } from 'types/common'

export type OpportunityDefiType = DefiType.LiquidityPool | DefiType.Staking

export type AssetIdsTuple =
  | readonly [AssetId, AssetId, AssetId]
  | readonly [AssetId, AssetId]
  | readonly [AssetId]
  | readonly []

export type OpportunityMetadata = {
  apy: string
  assetId: AssetId
  provider: DefiProvider
  tvl: string
  type: DefiType
  // For LP opportunities, this is the same as the AssetId
  // For staking opportunities i.e when you stake your LP asset, this is the AssetId of the LP asset being staked
  // Which might or might not be the same as the AssetId, e.g
  // - with LP staking, you stake an LP token
  // - with Idle, you stake a yield-bearing token, so the underlyingAssetId *is* the AssetId
  // - with Cosmos SDK, you stake the underlying asset directly, so the underlyingAssetId *is* the AssetId
  underlyingAssetId: AssetId
  // The AssetId or AssetIds this opportunity represents
  // For LP tokens, that's an asset pair
  // For opportunities a la Idle, that's the asset the opportunity wraps
  underlyingAssetIds: AssetIdsTuple
  // The underlying amount of underlyingAssetId 0 and maybe 1 per 1 LP token, in base unit
  underlyingAssetRatios: readonly [string, string] | readonly [string]
  // The reward assets this opportunity yields, typically 1/2 or 3 assets max.
  // TODO: Optional for backwards compatibility, but it should always be present
  rewardAssetIds?: AssetIdsTuple
  expired?: boolean
  name?: string
}

// User-specific values for this opportunity
export type UserStakingOpportunity = {
  // The amount of farmed LP tokens
  stakedAmountCryptoPrecision: string
  // The amount of rewards available to claim for the farmed LP position
  rewardsAmountsCryptoPrecision:
    | readonly [string, string]
    | readonly [string, string]
    | readonly [string]
    | readonly []
}

// The AccountId of the staking contract in the form of chainId:accountAddress
export type StakingId = Nominal<string, 'StakingId'> & AssetId
// The AccountId of the LP contract in the form of chainId:accountAddress
export type LpId = Nominal<string, 'LpId'> & AssetId

export type OpportunityId = LpId | StakingId
// The unique identifier of an lp opportunity in the form of UserAccountId*StakingId
export type UserStakingId = `${AccountId}*${StakingId}`

export type OpportunitiesState = {
  lp: {
    byAccountId: PartialRecord<AccountId, LpId[]> // a 1:n foreign key of which user AccountIds hold this LpId
    byId: PartialRecord<LpId, OpportunityMetadata>
    ids: LpId[]
  }
  // Staking is the odd one here - it isn't a portfolio holding, but rather a synthetic value living on a smart contract
  // Which means we can't just derive the data from portfolio, marketData and other slices but have to actually store the amount in the slice
  userStaking: {
    byId: PartialRecord<UserStakingId, UserStakingOpportunity>
    ids: UserStakingId[]
  }

  staking: {
    // a 1:n foreign key of which user AccountIds hold this StakingId
    byAccountId: PartialRecord<AccountId, StakingId[]>
    byId: PartialRecord<StakingId, OpportunityMetadata>
    ids: StakingId[]
  }
}

export type OpportunityMetadataById = OpportunitiesState[OpportunityDefiType]['byId']
export type OpportunityDataById = OpportunitiesState[OpportunityDefiType]['byAccountId']

export type GetOpportunityMetadataInput = {
  opportunityId: OpportunityId
  opportunityType: OpportunityDefiType
  defiType: DefiType
  defiProvider: DefiProvider
}

export type GetOpportunityUserDataInput = {
  accountId: AccountId
  opportunityId: OpportunityId
  opportunityType: OpportunityDefiType
  defiType: DefiType
  defiProvider: DefiProvider
}

export type GetOpportunityIdsInput = {
  defiType: DefiType
  defiProvider: DefiProvider
}

export type GetOpportunityMetadataOutput = {
  byId: OpportunitiesState[OpportunityDefiType]['byId']
  type: OpportunityDefiType
}
export type GetOpportunityUserDataOutput = {
  byAccountId: OpportunitiesState[OpportunityDefiType]['byAccountId']
  type: OpportunityDefiType
}

export type GetOpportunityUserStakingDataOutput = {
  byId: OpportunitiesState['userStaking']['byId']
}

export type GetOpportunityIdsOutput = OpportunityId[]

export type StakingEarnOpportunityType = OpportunityMetadata & {
  /**
   * @deprecated Here for backwards compatibility until https://github.com/shapeshift/web/pull/3218 goes in
   */
  unclaimedRewards?: string
  stakedAmountCryptoPrecision?: string
  rewardsAmountsCryptoPrecision?:
    | readonly [string, string, string]
    | readonly [string, string]
    | readonly [string]
    | readonly []
  underlyingToken0Amount?: string
  underlyingToken1Amount?: string
  isVisible?: boolean
} & EarnOpportunityType & { opportunityName: string | undefined } // overriding optional opportunityName property
