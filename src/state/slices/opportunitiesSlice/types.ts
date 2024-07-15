import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import type { PartialRecord } from '@shapeshiftoss/types'
import type { Nominal } from 'types/common'

import type { CosmosSdkStakingSpecificUserStakingOpportunity } from './resolvers/cosmosSdk/types'
import type { FoxySpecificUserStakingOpportunity } from './resolvers/foxy/types'
import type { ThorchainSaversStakingSpecificMetadata } from './resolvers/thorchainsavers/types'
import type {
  OpportunitiesMetadataResolverInput,
  OpportunitiesUserDataResolverInput,
  OpportunityIdsResolverInput,
  OpportunityMetadataResolverInput,
  OpportunityUserDataResolverInput,
} from './resolvers/types'

export enum DefiType {
  LiquidityPool = 'lp',
  Staking = 'staking',
}

export enum DefiProvider {
  ShapeShift = 'ShapeShift',
  rFOX = 'rFOX',
  EthFoxStaking = 'ETH/FOX Staking',
  UniV2 = 'Uniswap V2',
  CosmosSdk = 'Cosmos SDK',
  ThorchainSavers = 'THORChain Savers',
}

export type DefiProviderMetadata = {
  provider: string
  icon: string
  color: string
  url?: string
}

export type AssetIdsTuple =
  | readonly [AssetId, AssetId, AssetId]
  | readonly [AssetId, AssetId]
  | readonly [AssetId]
  | readonly []

export type OpportunityMetadataBase = {
  apy?: string
  assetId: AssetId
  id: OpportunityId
  provider: string
  tvl?: string
  type: DefiType
  // An optional user-facing `type` equivalent to allow us to display the opportunity type in the UI
  // our `type` property is an implementation detail that somehow ended up being user-facing, and might go away
  // This is actually more granular than the `type` property, i.e different opportunities of the same type/version might be part of different groups
  // Currently for read-only opportunities only
  group?: string
  // An opportunity might have its own icon e.g Cosmos SDK validators each have their own icon
  // If not specified, the underlying asset IDs' icons are used as icons
  icon?: string
  // For LP opportunities, this is the same as the AssetId
  // For staking opportunities i.e when you stake your LP asset, this is the AssetId of the LP asset being staked
  // Which might or might not be the same as the AssetId, e.g
  // - with LP staking, you stake an LP token
  // - with Cosmos SDK, you stake the underlying asset directly, so the underlyingAssetId *is* the AssetId
  underlyingAssetId: AssetId
  // The AssetId or AssetIds this opportunity represents
  // For LP tokens, that's an asset pair
  // For opportunities a la FOXy, that's the asset the opportunity wraps
  underlyingAssetIds: AssetIdsTuple
  // The underlying amount of underlyingAssetId 0 and maybe 1 per 1 LP token, in base unit
  underlyingAssetRatiosBaseUnit: readonly string[]
  // The reward assets this opportunity yields, typically 1/2 or 3 assets max.
  // Can also be empty in case there are no denominated rewards or we are unable to track them
  rewardAssetIds: AssetIdsTuple
  isClaimableRewards: boolean
  isReadOnly?: boolean
  // claimableRewards: boolean
  expired?: boolean
  active?: boolean
  name: string
  version?: string
  tags?: string[]
}

export type OpportunityMetadata = OpportunityMetadataBase | ThorchainSaversStakingSpecificMetadata

// User-specific values for this opportunity
export type UserStakingOpportunityBase = {
  isLoaded: boolean
  userStakingId: UserStakingId
  // The amount of farmed LP tokens
  stakedAmountCryptoBaseUnit: string
  // The amount of rewards available to claim for the farmed LP position
  rewardsCryptoBaseUnit: {
    amounts:
      | readonly [string, string, string]
      | readonly [string, string]
      | readonly [string]
      | readonly []
    claimable: boolean
  }
}

export type UserStakingOpportunity =
  | UserStakingOpportunityBase
  | CosmosSdkStakingSpecificUserStakingOpportunity
  | FoxySpecificUserStakingOpportunity

export type UserStakingOpportunityWithMetadata = UserStakingOpportunity & OpportunityMetadata

// The AccountId of the staking contract in the form of chainId:accountAddress
export type StakingIdBase = Nominal<string, 'StakingId'> & AssetId
// Sometimes, an AssetIdish (i.e a a CAIP-19) is not enough to uniquely identify a staking opportunity
// So we add a StakingKey to the StakingId to make it unique
export type StakingKey = Nominal<string, 'StakingKey'>
export type StakingId = StakingIdBase | `${StakingIdBase}#${StakingKey}`
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

export type OpportunityDataById = OpportunitiesState[DefiType]['byAccountId']

export type GetOpportunityMetadataInput = {
  opportunityId: OpportunityId
  defiType: DefiType
  defiProvider: DefiProvider
}

export type GetOpportunityUserDataInput = {
  accountId: AccountId
  opportunityId: OpportunityId
  defiType: DefiType
  defiProvider: DefiProvider
}

export type GetOpportunityIdsInput = {
  defiType: DefiType
  defiProvider: DefiProvider
}

export type GetOpportunityMetadataOutput = {
  byId: Record<OpportunityId, OpportunityMetadata>
  type: DefiType
}

export type GetOpportunityUserDataOutput = {
  byAccountId: OpportunitiesState[DefiType]['byAccountId']
  type: DefiType
}

export type GetOpportunityUserStakingDataOutput = {
  byId: OpportunitiesState['userStaking']['byId']
}

export type GetOpportunityIdsOutput = OpportunityId[]

// TODO: This is not FDA-approved and should stop being consumed to make things a lot tidier without the added cholesterol
// This is legacy from previous implementations, we should be able to consume the raw opportunitiesSlice data and derive the rest in-place
type EarnDefiTypeBase = {
  type: string
  provider: string
  version?: string
  contractAddress?: string
  rewardAddress?: string
  apy?: number | string
  tvl?: string
  underlyingAssetId: AssetId
  assetId: AssetId
  id: OpportunityId
  fiatAmount: string
  /** @deprecated use cryptoAmountBaseUnit instead and derive precision amount from it*/
  cryptoAmountPrecision: string
  cryptoAmountBaseUnit: string
  expired?: boolean
  active?: boolean
  chainId: ChainId
  showAssetSymbol?: boolean
  isLoaded: boolean
  icons?: string[]
  // overrides any name down the road
  opportunityName: string
  highestBalanceAccountAddress?: string // FOX/ETH specific, let's change it to accountId across the line if we need it for other opportunities
}

export type StakingEarnOpportunityType = OpportunityMetadata &
  Partial<UserStakingOpportunityBase> & {
    isVisible?: boolean
  } & EarnDefiTypeBase & { opportunityName: string | undefined } // overriding optional opportunityName property

// A minimal user opportunity for read-only purposes, which does NOT conform to our usual types
// it isn't meant to be used as a full-fledged opportunity
export type ReadOnlyOpportunityType = {
  accountId: AccountId
  opportunityId: OpportunityId
  userStakingId?: UserStakingId // the derived serialization of the two above, only for staking opportunities
  stakedAmountCryptoBaseUnit: string
  rewardsCryptoBaseUnit: UserStakingOpportunityBase['rewardsCryptoBaseUnit']
  fiatAmount: string
  provider: string
}

export type LpEarnOpportunityType = OpportunityMetadataBase & {
  underlyingToken0AmountCryptoBaseUnit?: string
  underlyingToken1AmountCryptoBaseUnit?: string
  isVisible?: boolean
} & EarnDefiTypeBase & { opportunityName: string | undefined } // overriding optional opportunityName property

export type EarnOpportunityType = StakingEarnOpportunityType | LpEarnOpportunityType

export type AggregatedOpportunitiesByAssetIdReturn = {
  assetId: AssetId
  underlyingAssetIds: AssetIdsTuple
  apy: string
  fiatAmount: string
  cryptoBalancePrecision: string
  fiatRewardsAmount: string
  opportunities: Record<DefiType, OpportunityId[]>
}

export type AggregatedOpportunitiesByProviderReturn = {
  provider: string
  apy: string
  fiatAmount: string
  fiatRewardsAmount: string
  netProviderFiatAmount: string
  opportunities: Record<DefiType, OpportunityId[]>
}

export type TagDescription = {
  title: string
  description?: string
  icon?: JSX.Element
  bullets?: string[]
}

// Mapping types

export type MetadataResolverFunction = (
  args: OpportunityMetadataResolverInput,
) => Promise<{ data: GetOpportunityMetadataOutput }>

export type OpportunitiesMetadataResolverFunction = (
  args: OpportunitiesMetadataResolverInput,
) => Promise<{ data: GetOpportunityMetadataOutput }>

export type OpportunitiesUserDataResolverFunction = (
  args: OpportunitiesUserDataResolverInput,
) => Promise<{ data: GetOpportunityUserStakingDataOutput }>

export type OpportunityIdsResolverFunction = (
  args: OpportunityIdsResolverInput,
) => Promise<{ data: GetOpportunityIdsOutput }>

export type OpportunityUserDataResolverFunction = (
  args: OpportunityUserDataResolverInput,
) => Promise<{ data: GetOpportunityUserStakingDataOutput } | void>

export type DefiTypeToMetadataResolver = {
  [key in DefiType]?: MetadataResolverFunction
}

export type DefiTypeToOpportunitiesMetadataResolver = {
  [key in DefiType]?: OpportunitiesMetadataResolverFunction
}

export type DefiTypeToOpportunitiesUserDataResolver = {
  [key in DefiType]?: OpportunitiesUserDataResolverFunction
}

export type DefiTypeToOpportunityUserDataResolver = {
  [key in DefiType]?: OpportunityUserDataResolverFunction
}

export type DefiTypeToOpportunityIdsResolver = {
  [key in DefiType]?: OpportunityIdsResolverFunction
}

export type DefiProviderToMetadataResolver = {
  [key in DefiProvider]?: DefiTypeToMetadataResolver
}

export type DefiProviderToOpportunitiesMetadataResolver = {
  [key in DefiProvider]?: DefiTypeToOpportunitiesMetadataResolver
}

export type DefiProviderToOpportunitiesUserDataResolver = {
  [key in DefiProvider]?: DefiTypeToOpportunitiesUserDataResolver
}

export type DefiProviderToOpportunityUserDataResolver = {
  [key in DefiProvider]?: DefiTypeToOpportunityUserDataResolver
}

export type DefiProviderToOpportunityIdsResolver = {
  [key in DefiProvider]?: DefiTypeToOpportunityIdsResolver
}
