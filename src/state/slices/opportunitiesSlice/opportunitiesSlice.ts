import { createSlice } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/query/react'
import { DefiProvider } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import * as E from 'fp-ts/lib/Either'
import { pipe } from 'fp-ts/lib/function'
import * as TE from 'fp-ts/lib/TaskEither'
import merge from 'lodash/merge'
import uniq from 'lodash/uniq'
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
        const resolver = getMetadataResolversByDefiProviderAndDefiType(
          DefiProvider.FoxFarming,
          defiType,
        )

        const maybeData = await pipe(
          TE.tryCatch(
            () =>
              resolver({
                opportunityId,
                opportunityType,
                reduxApi: { dispatch, getState },
              }),
            () => new Error(),
          ),
          TE.map(resolved => resolved.data),
        )()

        return pipe(
          maybeData,
          E.match(
            err => {
              throw err
            },
            data => {
              dispatch(opportunities.actions.upsertOpportunityMetadata(data))

              return { data }
            },
          ),
        )
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

          const maybeData = await pipe(
            TE.tryCatch<Error, { data: GetOpportunityUserStakingDataOutput } | void>(
              () =>
                resolver({
                  opportunityId,
                  opportunityType,
                  accountId,
                  reduxApi: { dispatch, getState },
                }),
              () => new Error(),
            ),
            TE.map(resolved => resolved?.data),
          )()

          return pipe(
            maybeData,
            E.match(
              err => {
                throw err
              },
              data => {
                if (data) {
                  // If we get a `data` object back, this is userStakingData - LP just returns void, not `{data}`
                  dispatch(opportunities.actions.upsertUserStakingOpportunities(data))
                }

                const byAccountId = {
                  [accountId]: [opportunityId],
                } as OpportunityDataById

                const parsedData = {
                  byAccountId,
                  type: opportunityType,
                }

                dispatch(opportunities.actions.upsertOpportunityAccounts(parsedData))

                return { data: parsedData }
              },
            ),
          )
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
