import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import type { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import type { PartialRecord } from 'lib/utils'
import type { Nominal } from 'types/common'

export type OpportunityDefiType = DefiType.LiquidityPool | DefiType.Staking

export type OpportunityMetadata = {
  apy: string
  assetId: AssetId
  provider: DefiProvider
  tvl: string
  type: DefiType
  underlyingAssetIds: readonly [AssetId, AssetId]
  // The underlying amount of underlyingAssetId 0 and 1 per 1 LP token, in base unit
  underlyingAssetRatios: readonly [string, string]
  expired?: boolean
  name?: string
}

// User-specific values for this opportunity
export type UserStakingOpportunity = {
  // The amount of farmed LP tokens
  stakedAmountCryptoPrecision: string
  // The amount of rewards available to claim for the farmed LP position
  rewardsAmountCryptoPrecision: string
}

// The AccountId of the staking contract in the form of chainId:accountAddress
export type StakingId = Nominal<string, 'StakingId'>
// The AccountId of the LP contract in the form of chainId:accountAddress
export type LpId = Nominal<string, 'LpId'>
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
  opportunityId: LpId | StakingId
  opportunityType: OpportunityDefiType
  defiType: DefiType
}

export type GetOpportunityUserDataInput = {
  accountId: AccountId
  opportunityId: LpId | StakingId
  opportunityType: OpportunityDefiType
  defiType: DefiType
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
