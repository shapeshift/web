import { createSlice } from '@reduxjs/toolkit'
import type { BaseQueryError } from '@reduxjs/toolkit/dist/query/baseQueryTypes'
import { createApi } from '@reduxjs/toolkit/query/react'
import { DefiProvider } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import * as E from 'fp-ts/lib/Either'
import { pipe } from 'fp-ts/lib/function'
import * as O from 'fp-ts/lib/Option'
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
        const maybeData = await pipe(
          getMetadataResolversByDefiProviderAndDefiType(DefiProvider.FoxFarming, defiType),
          O.chainNullableK(resolver =>
            TE.tryCatch(
              () =>
                resolver({
                  opportunityId,
                  opportunityType,
                  reduxApi: { dispatch, getState },
                }),
              E.toError,
            ),
          ),
          O.chainNullableK(
            TE.map((resolved: { data: GetOpportunityMetadataOutput }) => resolved.data),
          ),
          O.getOrElse(() =>
            TE.left(
              new Error(`resolver for ${DefiProvider.FoxFarming}::${defiType} not implemented`),
            ),
          ),
        )()

        return pipe(
          maybeData,
          E.match<
            Error,
            GetOpportunityMetadataOutput,
            { data: GetOpportunityMetadataOutput } | { error: BaseQueryError<any> }
          >(
            err => ({
              error: {
                error: err.message,
                status: 'CUSTOM_ERROR',
              },
            }),
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
        const maybeData = await pipe(
          getUserDataResolversByDefiProviderAndDefiType(DefiProvider.FoxFarming, defiType),
          O.chainNullableK(resolver =>
            TE.tryCatch<Error, { data: GetOpportunityUserStakingDataOutput } | void>(
              () =>
                resolver({
                  opportunityId,
                  opportunityType,
                  accountId,
                  reduxApi: { dispatch, getState },
                }),
              E.toError,
            ),
          ),
          O.chainNullableK(TE.map(resolved => O.fromNullable(resolved?.data))),
          O.getOrElse(() =>
            TE.left(
              new Error(`resolver for ${DefiProvider.FoxFarming}::${defiType} not implemented`),
            ),
          ),
        )()

        return pipe(
          maybeData,
          E.match<
            Error,
            O.Option<GetOpportunityUserStakingDataOutput>,
            E.Either<{ error: BaseQueryError<any> }, boolean>
          >(
            // An actual error in the maybeData Either<>, capture it as a Left
            err =>
              E.left({
                error: {
                  error: err.message,
                  status: 'CUSTOM_ERROR',
                },
              }),
            O.match(
              () => E.right(true),
              data => {
                // We really only care about `data` for this specific line
                dispatch(opportunities.actions.upsertUserStakingOpportunities(data))
                return E.right(true)
              },
            ),
          ),
          E.match(
            (error: BaseQueryError<any>) => error,
            () => {
              // Resolver didn't fail, and we inserted userStakingOpportunities in the previous method in the pipeline
              // We can now safely insert the matching accounts
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
      },
    }),
  }),
})
