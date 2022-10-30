import { createSlice } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/query/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import type { DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiProvider } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import merge from 'lodash/merge'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'
import type { Nominal } from 'types/common'

import {
  getMetadataResolversByDefiProviderAndDefiType,
  getUserDataResolversByDefiProviderAndDefiType,
} from './resolvers/utils'

export type OpportunityMetadata = {
  apy: string
  assetId: AssetId
  provider: DefiProvider
  tvl: string
  type: DefiType
  underlyingAssetIds: readonly [AssetId, AssetId]
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

export type OpportunityMetadataById = OpportunitiesState['lp' | 'staking']['byId']
export type OpportunityDataById = OpportunitiesState['lp' | 'staking']['byAccountId']

export type GetOpportunityMetadataInput = {
  opportunityId: LpId | StakingId
  opportunityType: 'lp' | 'staking'
  defiType: DefiType
}

export type GetOpportunityDataInput = {
  accountId: AccountId
  opportunityId: LpId | StakingId
  opportunityType: 'lp' | 'staking'
  defiType: DefiType
}

type GetOpportunityMetadataOutput = any
type GetOpportunityDataOutput = any

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

export const opportunities = createSlice({
  name: 'opportunitiesData',
  initialState,
  reducers: {
    clear: () => initialState,
    upsertOpportunityMetadata: (
      draftState,
      { payload }: { payload: { metadata: OpportunityMetadataById; type: 'lp' | 'staking' } },
    ) => {
      draftState[payload.type].byId = {
        ...draftState[payload.type].byId,
        ...payload.metadata,
      }
      draftState[payload.type].ids = Array.from(new Set([...Object.keys(payload.metadata)]))
    },
    // TODO: testme
    upsertOpportunityAccounts: (
      draftState,
      { payload }: { payload: { byAccountId: OpportunityDataById; type: 'lp' | 'staking' } },
    ) => {
      draftState[payload.type].byAccountId = merge(
        draftState[payload.type].byAccountId,
        payload.byAccountId,
      )
    },
    upsertUserStakingOpportunities: (
      draftState,
      { payload }: { payload: OpportunitiesState['userStaking']['byId'] },
    ) => {
      draftState.userStaking.byId = {
        ...draftState.staking.byId,
        ...payload,
      }
      draftState.userStaking.ids = Array.from(new Set([...Object.keys(payload)])) as UserStakingId[]
    },
  },
})

export const opportunitiesApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'opportunitiesApi',
  keepUnusedDataFor: 300,
  endpoints: build => ({
    getOpportunityMetadata: build.query<GetOpportunityMetadataOutput, GetOpportunityMetadataInput>({
      queryFn: async ({ opportunityId, opportunityType, defiType }, { dispatch, getState }) => {
        const resolver = getMetadataResolversByDefiProviderAndDefiType(
          DefiProvider.FoxFarming,
          defiType,
        )
        const resolved = await resolver({
          opportunityId,
          opportunityType,
          reduxApi: { dispatch, getState },
        })

        dispatch(opportunities.actions.upsertOpportunityMetadata(resolved.data))

        return { data: resolved.data }
      },
    }),
    getOpportunityUserData: build.query<GetOpportunityDataOutput, GetOpportunityDataInput>({
      queryFn: async (
        { accountId, opportunityId, opportunityType, defiType },
        { dispatch, getState },
      ) => {
        try {
          // TODO: curry helpers
          const resolver = getUserDataResolversByDefiProviderAndDefiType(
            DefiProvider.FoxFarming,
            defiType,
          )
          // TODO: Do we even need this at all? Perhaps return from the query for easy access with select() ?
          // @ts-ignore
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const resolved = await resolver({
            opportunityId,
            accountId,
            reduxApi: { dispatch, getState },
          })

          const byAccountId = {
            [accountId]: [opportunityId],
          } as OpportunityDataById

          const data = {
            byAccountId,
            type: opportunityType,
          }

          dispatch(opportunities.actions.upsertOpportunityAccounts(data))

          return { data }
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Error getting opportunities data'

          return {
            error: {
              error: message,
              status: 'CUSTOM_ERROR',
            },
          }
        }
      },
    }),
  }),
})
