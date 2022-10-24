import { createSlice } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/query/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import type { DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'
import type { Nominal } from 'types/common'

export const initialState: OpportunitiesState = {
  lp: {
    byAccountId: {},
    byId: {},
    ids: [],
  },
  staking: {
    byAccountId: {},
    byId: {},
    ids: [],
  },
  userStaking: {
    byId: {},
    ids: [],
  },
}

type OpportunityMetadata = {
  apy: string
  assetId: AssetId
  provider: string
  tvl: string
  type: DefiType
  underlyingAssetIds: [AssetId, AssetId]
}

// User-specific values for this opportunity
type UserStakingOpportunity = {
  // The amount of farmed LP tokens
  stakedAmountCryptoPrecision: string
  // The amount of rewards available to claim for the farmed LP position
  rewardsAmountCryptoPrecision: string
}

// The AccountId of the staking contract in the form of chainId:accountAddress
type StakingId = Nominal<string, 'StakingId'>
// The AccountId of the LP contract in the form of chainId:accountAddress
type LpId = Nominal<string, 'LpId'>
// The unique identifier of an lp opportunity in the form of UserAccountId*StakingId
type UserStakingId = `${AccountId}*${StakingId}`

export type OpportunitiesState = {
  lp: {
    byAccountId: Record<AccountId, LpId[]> // a 1:n foreign key of which user AccountIds hold this LpId  [id: AccountId]: LpId[]
    byId: Record<LpId, OpportunityMetadata>
    ids: LpId[]
  }
  // Staking is the odd one here - it isn't a portfolio holding, but rather a synthetic value living on a smart contract
  // Which means we can't just derive the data from portfolio, marketData and other slices but have to actually store the amount in the slice
  userStaking: {
    byId: Record<UserStakingId, UserStakingOpportunity>
    ids: UserStakingId[]
  }

  staking: {
    // a 1:n foreign key of which user AccountIds hold this StakingId
    byAccountId: Record<AccountId, StakingId[]>
    byId: Record<StakingId, OpportunityMetadata>
    ids: StakingId[]
  }
}

type AccountIdsPayload = {
  payload: AccountId[]
}

export type OpportunityMetadataById = {
  [k: FarmingId | LpId]: LpOpportunity | FarmingOpportunity
}

export type OpportunityUserDataById = {
  [k: UserFarmingId | UserLpId]: UserFarmingOpportunity | UserLpOpportunity
}

const updateOrInsertUserAccountIds = (
  opportunitiesDraft: OpportunitiesState,
  accountIds: AccountId[],
) => {
  accountIds.forEach(accountId => {
    opportunitiesDraft.lp.byAccountId[accountId] = []
    opportunitiesDraft.farming.byAccountId[accountId] = []
  })
}

const updateOrInsertOpportunityAccountIds = (
  opportunitiesDraft: OpportunitiesState,
  opportunityAccountIds: AccountId[],
) => {
  opportunitiesDraft.lp.ids = opportunityAccountIds
  opportunitiesDraft.farming.ids = opportunityAccountIds
}

export const opportunities = createSlice({
  name: 'opportunitiesData',
  initialState,
  reducers: {
    clear: () => initialState,
    upsertUserAccountIds: (opportunitiesDraft, { payload }: AccountIdsPayload) => {
      updateOrInsertUserAccountIds(opportunitiesDraft, payload)
    },
    upsertOpportunityAccountIds: (opportunitiesDraft, { payload }: AccountIdsPayload) => {
      updateOrInsertOpportunityAccountIds(opportunitiesDraft, payload)
    },
    upsertOpportunityMetadata: (
      state,
      { payload }: { payload: { metadata: OpportunityMetadataById; type: 'lp' | 'farming' } },
    ) => {
      state[payload.type].byId = {
        ...state[payload.type].byId,
        ...payload.metadata,
      }
      state[payload.type].ids = Array.from(new Set([...Object.keys(payload.metadata)]))
    },
    upsertOpportunityUserData: (
      state,
      {
        payload,
      }: { payload: { metadata: OpportunityUserDataById; type: 'userLp' | 'userFarming' } },
    ) => {
      state[payload.type].byId = {
        ...state[payload.type].byId,
        ...payload.metadata,
      }
      state[payload.type].ids = Array.from(new Set([...Object.keys(payload.metadata)]))
    },
    // upsertOpportunitiesData: (opportunitiesSliceDraft, { payload }: { payload: {} }) => {}, // TODO:
  },
})

export const opportunitiesApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'opportunitiesApi',
  keepUnusedDataFor: 300,
  endpoints: _build => ({}),
})
