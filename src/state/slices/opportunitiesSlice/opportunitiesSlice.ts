import { createSlice } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/query/react'
import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import merge from 'lodash/merge'
import uniq from 'lodash/uniq'
import { PURGE } from 'redux-persist'
import { logger } from 'lib/logger'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'

import {
  getMetadataResolversByDefiProviderAndDefiType,
  getOpportunitiesMetadataResolversByDefiProviderAndDefiType,
  getOpportunitiesUserDataResolversByDefiProviderAndDefiType,
  getOpportunityIdsResolversByDefiProviderAndDefiType,
  getUserDataResolversByDefiProviderAndDefiType,
} from './resolvers/utils'
import type {
  GetOpportunityIdsInput,
  GetOpportunityIdsOutput,
  GetOpportunityMetadataInput,
  GetOpportunityMetadataOutput,
  GetOpportunityUserDataInput,
  GetOpportunityUserDataOutput,
  GetOpportunityUserStakingDataOutput,
  OpportunitiesState,
  OpportunityDataById,
  OpportunityId,
  UserStakingId,
} from './types'
import { deserializeUserStakingId } from './utils'

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
      const payloadIds = Object.keys(payload.byId) as OpportunityId[]

      draftState[payload.type].byId = Object.assign({}, draftState[payload.type].byId, payload.byId)
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
  extraReducers: builder => {
    builder.addCase(PURGE, () => {
      return initialState
    })
  },
})

export const opportunitiesApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'opportunitiesApi',
  keepUnusedDataFor: 300,
  endpoints: build => ({
    getOpportunityIds: build.query<GetOpportunityIdsOutput, GetOpportunityIdsInput>({
      queryFn: async ({ defiType, defiProvider }) => {
        try {
          const resolver = getOpportunityIdsResolversByDefiProviderAndDefiType(
            defiProvider,
            defiType,
          )
          const resolved = await resolver()

          return { data: resolved.data }
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Error getting opportunityIds'

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
    getOpportunityMetadata: build.query<GetOpportunityMetadataOutput, GetOpportunityMetadataInput>({
      queryFn: async (
        { opportunityId, opportunityType, defiType, defiProvider },
        { dispatch, getState },
      ) => {
        try {
          const resolver = getMetadataResolversByDefiProviderAndDefiType(defiProvider, defiType)
          const resolved = await resolver({
            opportunityId,
            opportunityType,
            reduxApi: { dispatch, getState },
          })

          dispatch(opportunities.actions.upsertOpportunityMetadata(resolved.data))

          return { data: resolved.data }
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Error getting opportunity metadata'

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
    getOpportunitiesMetadata: build.query<
      GetOpportunityMetadataOutput,
      Omit<GetOpportunityMetadataInput, 'opportunityId'>
    >({
      queryFn: async ({ opportunityType, defiType, defiProvider }, { dispatch, getState }) => {
        try {
          const resolver = getOpportunitiesMetadataResolversByDefiProviderAndDefiType(
            defiProvider,
            defiType,
          )
          const resolved = await resolver({
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
        { accountId, opportunityId, opportunityType, defiType, defiProvider },
        { dispatch, getState },
      ) => {
        try {
          const resolver = getUserDataResolversByDefiProviderAndDefiType(defiProvider, defiType)

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
    getOpportunitiesUserData: build.query<
      GetOpportunityUserDataOutput,
      Omit<GetOpportunityUserDataInput, 'opportunityId'>
    >({
      queryFn: async (
        { accountId, opportunityType, defiType, defiProvider },
        { dispatch, getState },
      ) => {
        try {
          const state: any = getState() // ReduxState causes circular dependency
          const selectOpportunityIds = opportunitiesApi.endpoints.getOpportunityIds.select({
            defiType: DefiType.Staking,
            defiProvider: DefiProvider.Idle,
          })
          const { data: opportunityIds } = selectOpportunityIds(state)

          if (!opportunityIds) {
            throw new Error("Can't select idle staking OpportunityIds")
          }

          const resolver = getOpportunitiesUserDataResolversByDefiProviderAndDefiType(
            defiProvider,
            defiType,
          )

          if (!resolver) {
            throw new Error(`resolver for ${defiProvider}::${defiType} not implemented`)
          }

          const resolved = await resolver({
            opportunityIds,
            opportunityType,
            accountId,
            reduxApi: { dispatch, getState },
          })

          if (resolved?.data) {
            dispatch(opportunities.actions.upsertUserStakingOpportunities(resolved.data))
          }

          const byAccountId = {
            [accountId]: Object.keys(resolved?.data.byId ?? {}).map(
              userStakingId => deserializeUserStakingId(userStakingId as UserStakingId)[1],
            ),
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
