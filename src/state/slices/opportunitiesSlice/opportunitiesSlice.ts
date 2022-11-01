import { createSlice } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/query/react'
import { DefiProvider } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import merge from 'lodash/merge'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'

import {
  getMetadataResolversByDefiProviderAndDefiType,
  getUserDataResolversByDefiProviderAndDefiType,
} from './resolvers/utils'
import type {
  GetOpportunityMetadataInput,
  GetOpportunityMetadataOutput,
  GetOpportunityUserDataInput,
  GetOpportunityUserDataOutput,
  OpportunitiesState,
  OpportunityDataById,
  UserStakingId,
} from './types'

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
      { payload }: { payload: GetOpportunityMetadataOutput },
    ) => {
      draftState[payload.type].byId = {
        ...draftState[payload.type].byId,
        ...payload.byId,
      }
      draftState[payload.type].ids = Array.from(new Set([...Object.keys(payload.byId)]))
    },
    // TODO: testme
    upsertOpportunityAccounts: (
      draftState,
      { payload }: { payload: GetOpportunityUserDataOutput },
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
    getOpportunityUserData: build.query<GetOpportunityUserDataOutput, GetOpportunityUserDataInput>({
      queryFn: async (
        { accountId, opportunityId, opportunityType, defiType },
        { dispatch, getState },
      ) => {
        try {
          const resolver = getUserDataResolversByDefiProviderAndDefiType(
            DefiProvider.FoxFarming,
            defiType,
          )

          if (!resolver) {
            throw new Error(`resolver for ${DefiProvider.FoxFarming}::${defiType} not implemented`)
          }

          // TODO: This commit authors LP slice population only - for Fox staking we will want to assign this to a variable and actually use the data
          // The reason for that is for EVM chains LPs, we just need to await this promise resolution - if this resolves, it means we have portfolio data
          // If this throws, the RTK query is rejected and we never insert that AccountId into state
          await resolver({
            opportunityId,
            opportunityType,
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
