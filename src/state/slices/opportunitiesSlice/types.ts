import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import type { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import type { PartialRecord } from 'lib/utils'
import type { Nominal } from 'types/common'

import type { CosmosSdkStakingSpecificUserStakingOpportunity } from './resolvers/cosmosSdk/types'
import type { FoxySpecificUserStakingOpportunity } from './resolvers/foxy/types'
import type { IdleStakingSpecificMetadata } from './resolvers/idle/types'
import type { ThorchainSaversStakingSpecificMetadata } from './resolvers/thorchainsavers/types'

export type OpportunityDefiType = DefiType.LiquidityPool | DefiType.Staking

export type AssetIdsTuple =
  | readonly [AssetId, AssetId, AssetId]
  | readonly [AssetId, AssetId]
  | readonly [AssetId]
  | readonly []

export type OpportunityMetadataBase = {
  apy: string
  assetId: AssetId
  id: OpportunityId
  provider: DefiProvider
  tvl: string
  type: DefiType
  // An opportunity might have its own icon e.g Cosmos SDK validators each have their own icon
  // If not specified, the underlying asset IDs' icons are used as icons
  icon?: string
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
  underlyingAssetRatiosBaseUnit: readonly [string, string] | readonly [string]
  // The reward assets this opportunity yields, typically 1/2 or 3 assets max.
  // TODO: Optional for backwards compatibility, but it should always be present
  rewardAssetIds?: AssetIdsTuple
  expired?: boolean
  name: string
  version?: string
  tags?: string[]
}

export type OpportunityMetadata =
  | OpportunityMetadataBase
  | ThorchainSaversStakingSpecificMetadata
  | IdleStakingSpecificMetadata

// User-specific values for this opportunity
export type UserStakingOpportunityBase = {
  userStakingId: UserStakingId
  // The amount of farmed LP tokens
  stakedAmountCryptoBaseUnit: string
  // The amount of rewards available to claim for the farmed LP position
  rewardsAmountsCryptoBaseUnit:
    | readonly [string, string, string]
    | readonly [string, string]
    | readonly [string]
    | readonly []
}

export type UserStakingOpportunity =
  | UserStakingOpportunityBase
  | CosmosSdkStakingSpecificUserStakingOpportunity
  | FoxySpecificUserStakingOpportunity

export type UserStakingOpportunityWithMetadata = UserStakingOpportunity & OpportunityMetadata

// The AccountId of the staking contract in the form of chainId:accountAddress
export type StakingId = Nominal<string, 'StakingId'> & AssetId
// The AccountId of the LP contract in the form of chainId:accountAddress
export type LpId = Nominal<string, 'LpId'> & AssetId

export type ValidatorId = Nominal<string, 'ValidatorId'> & AccountId
export type OpportunityId = LpId | StakingId | ValidatorId
// The unique identifier of an lp opportunity in the form of UserAccountId*StakingId
export type UserStakingId = `${AccountId}*${StakingId}`

export type OpportunitiesState = {
  lp: {
    byAccountId: PartialRecord<AccountId, LpId[]> // a 1:n foreign key of which user AccountIds hold this LpId
    byId: PartialRecord<LpId, OpportunityMetadataBase>
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
  byId: Record<OpportunityId, OpportunityMetadata>
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

// TODO: This is not FDA-approved and should stop being consumed to make things a lot tidier without the added cholesterol
export type EarnOpportunityType = {
  type?: string
  provider: DefiProvider
  version?: string
  contractAddress?: string
  rewardAddress?: string
  apy?: number | string
  tvl: string
  underlyingAssetId?: AssetId
  assetId: AssetId
  id: OpportunityId
  fiatAmount: string
  /** @deprecated use cryptoAmountBaseUnit instead and derive precision amount from it*/
  cryptoAmountPrecision: string
  cryptoAmountBaseUnit: string
  expired?: boolean
  chainId: ChainId
  showAssetSymbol?: boolean
  isLoaded: boolean
  icons?: string[]
  // overrides any name down the road
  opportunityName?: string
  highestBalanceAccountAddress?: string // FOX/ETH specific, let's change it to accountId across the line if we need it for other opportunities
}

export type StakingEarnOpportunityType = OpportunityMetadata &
  Partial<UserStakingOpportunityBase> & {
    underlyingToken0AmountCryptoBaseUnit?: string
    underlyingToken1AmountCryptoBaseUnit?: string
    isVisible?: boolean
  } & EarnOpportunityType & { opportunityName: string | undefined } // overriding optional opportunityName property

export type LpEarnOpportunityType = OpportunityMetadataBase & {
  underlyingToken0AmountCryptoBaseUnit?: string
  underlyingToken1AmountCryptoBaseUnit?: string
  isVisible?: boolean
} & EarnOpportunityType & { opportunityName: string | undefined } // overriding optional opportunityName property

export type AggregatedOpportunitiesByAssetIdReturn = {
  assetId: AssetId
  underlyingAssetIds: AssetIdsTuple
  netApy: string
  fiatAmount: string
  cryptoBalancePrecision: string
  fiatRewardsAmount: string
  opportunities: Record<DefiType, OpportunityId[]>
}

export type TagDescription = {
  title: string
  description?: string
  icon?: JSX.Element
  bullets?: string[]
}
