import { createSlice } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/query/react'
import { DefiProvider } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import merge from 'lodash/merge'
import uniq from 'lodash/uniq'
import { logger } from 'lib/logger'
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
  GetOpportunityUserStakingDataOutput,
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

const moduleLogger = logger.child({ namespace: ['opportunitiesSlice'] })

export const opportunities = createSlice({
  name: 'opportunitiesData',
  initialState,
  reducers: {
    clear: () => initialState,
    upsertOpportunityMetadata: (
      draftState,
      { payload }: { payload: GetOpportunityMetadataOutput },
    ) => {
      const payloadIds = Object.keys(payload.byId)

      draftState[payload.type].byId = {
        ...draftState[payload.type].byId,
        ...payload.byId,
      }
      draftState[payload.type].ids = uniq([...draftState[payload.type].ids, ...payloadIds])
    },
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
      { payload }: { payload: GetOpportunityUserStakingDataOutput },
    ) => {
      const payloadIds = Object.keys(payload.byId) as UserStakingId[]
      draftState.userStaking.byId = merge(draftState.userStaking.byId, payload.byId)
      draftState.userStaking.ids = uniq([...draftState.userStaking.ids, ...payloadIds])
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
        try {
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
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Error getting opportunities metadata'

          moduleLogger.debug(message)

          return {
            error: {
              error: message,
              status: 'CUSTOM_ERROR',
            },
          }
        }
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

          const resolved = await resolver({
            opportunityId,
            opportunityType,
            accountId,
            reduxApi: { dispatch, getState },
          })

          if (resolved?.data) {
            // If we get a `data` object back, this is userStakingData - LP just returns void, not `{data}`
            dispatch(opportunities.actions.upsertUserStakingOpportunities(resolved.data))
          }

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

          moduleLogger.debug(message)

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
