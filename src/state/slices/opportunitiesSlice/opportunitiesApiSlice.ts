import { createApi } from '@reduxjs/toolkit/query/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'

import {
  getMetadataResolversByDefiProviderAndDefiType,
  getOpportunitiesMetadataResolversByDefiProviderAndDefiType,
  getOpportunitiesUserDataResolversByDefiProviderAndDefiType,
  getOpportunityIdsResolversByDefiProviderAndDefiType,
  getUserDataResolversByDefiProviderAndDefiType,
} from './mappings'
import { opportunities } from './opportunitiesSlice'
import type { ReduxApi } from './resolvers/types'
import type {
  GetOpportunityIdsInput,
  GetOpportunityIdsOutput,
  GetOpportunityMetadataInput,
  GetOpportunityUserDataInput,
  OpportunityDataById,
  OpportunityId,
  UserStakingId,
} from './types'
import { DefiProvider } from './types'
import { deserializeUserStakingId, opportunityIdToChainId } from './utils'

// tsc is drunk, extracting this makes it happy
const getOpportunityIds = (
  {
    accountId,
    defiProvider,
    defiType,
  }: Pick<GetOpportunityMetadataInput, 'defiProvider' | 'defiType'> & { accountId?: AccountId },
  { getState }: { getState: ReduxApi['getState'] },
): OpportunityId[] | undefined => {
  const selectOpportunityIds = opportunitiesApi.endpoints.getOpportunityIds.select({
    defiType,
    defiProvider,
  })
  const { data: opportunityIds } = selectOpportunityIds(getState() as any)

  console.log(accountId, 'accountId in getOpportunityIds')
  // if we're not passed an AccountId, return all opportunityIds
  if (!accountId) return opportunityIds

  // if we're passed an AccountId, use it as a filter
  const { chainId: accountChainId } = fromAccountId(accountId)

  return opportunityIds?.filter(
    opportunityId => opportunityIdToChainId(opportunityId) === accountChainId,
  )
}

export const opportunitiesApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'opportunitiesApi',
  keepUnusedDataFor: 300,
  endpoints: build => ({
    getOpportunityIds: build.query<GetOpportunityIdsOutput, GetOpportunityIdsInput>({
      queryFn: async ({ defiType, defiProvider }, { dispatch, getState }) => {
        try {
          const resolver = getOpportunityIdsResolversByDefiProviderAndDefiType(
            defiProvider,
            defiType,
          )

          if (!resolver) {
            throw new Error(`resolver for ${defiProvider}::${defiType} not implemented`)
          }

          const resolved = await resolver({ reduxApi: { dispatch, getState } })

          return { data: resolved.data }
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Error getting opportunityIds'
          return {
            error: {
              error: message,
              status: 'CUSTOM_ERROR',
            },
          }
        }
      },
    }),
    getOpportunityMetadata: build.query<null, GetOpportunityMetadataInput[]>({
      queryFn: async (queries, { dispatch, getState }) => {
        await Promise.allSettled(
          queries.map(async ({ opportunityId, defiType, defiProvider }) => {
            try {
              const resolver = getMetadataResolversByDefiProviderAndDefiType(defiProvider, defiType)

              if (!resolver) {
                console.warn(`resolver for ${defiProvider}::${defiType} not implemented`)
                return
              }

              const resolved = await resolver({
                opportunityId,
                defiType,
                reduxApi: { dispatch, getState },
              })

              // TODO: collect and dispatch once to improve perf locally
              dispatch(opportunities.actions.upsertOpportunitiesMetadata(resolved.data))
            } catch (e) {
              const message = e instanceof Error ? e.message : 'Error getting opportunity metadata'
              console.error(message)
            }
          }),
        )

        return { data: null }
      },
    }),
    getOpportunitiesMetadata: build.query<
      null,
      Omit<GetOpportunityMetadataInput, 'opportunityId'>[]
    >({
      queryFn: async (queries, { dispatch, getState }) => {
        await Promise.allSettled(
          queries.map(async ({ defiType, defiProvider }) => {
            try {
              const opportunityIds = getOpportunityIds({ defiProvider, defiType }, { getState })

              const resolver = getOpportunitiesMetadataResolversByDefiProviderAndDefiType(
                defiProvider,
                defiType,
              )

              if (!resolver) {
                console.warn(`resolver for ${defiProvider}::${defiType} not implemented`)
                return
              }

              const resolved = await resolver({
                opportunityIds,
                defiType,
                reduxApi: { dispatch, getState },
              })

              // TODO: collect and dispatch once to improve perf locally
              dispatch(opportunities.actions.upsertOpportunitiesMetadata(resolved.data))
            } catch (e) {
              const message =
                e instanceof Error ? e.message : 'Error getting opportunities metadata'
              console.error(message)
            }
          }),
        )

        return { data: null }
      },
    }),
    getOpportunityUserData: build.query<null, GetOpportunityUserDataInput[]>({
      queryFn: async (queries, { dispatch, getState }) => {
        await Promise.allSettled(
          queries.map(async ({ accountId, opportunityId, defiType, defiProvider }) => {
            try {
              const resolver = getUserDataResolversByDefiProviderAndDefiType(defiProvider, defiType)

              if (!resolver) {
                throw new Error(`resolver for ${DefiProvider.UniV2}::${defiType} not implemented`)
              }

              const { chainId: accountChainId } = fromAccountId(accountId)
              const opportunityChainId = opportunityIdToChainId(opportunityId)
              if (opportunityChainId !== accountChainId) {
                const byAccountId: OpportunityDataById = {
                  [accountId]: [],
                }

                const data = {
                  byAccountId,
                  type: defiType,
                }

                // TODO: collect and dispatch once to improve perf locally
                dispatch(opportunities.actions.upsertOpportunityAccounts(data))
                return { data }
              }

              const resolved = await resolver({
                opportunityId,
                defiType,
                accountId,
                reduxApi: { dispatch, getState },
              })

              if (resolved?.data) {
                // TODO: collect and dispatch once to improve perf locally
                // If we get a `data` object back, this is userStakingData - LP just returns void, not `{data}`
                dispatch(opportunities.actions.upsertUserStakingOpportunities(resolved.data))
              }

              const byAccountId: OpportunityDataById = {
                [accountId]: [opportunityId],
              }

              const data = {
                byAccountId,
                type: defiType,
              }

              // TODO: collect and dispatch once to improve perf locally
              dispatch(opportunities.actions.upsertOpportunityAccounts(data))
            } catch (e) {
              const message = e instanceof Error ? e.message : 'Error getting opportunities data'
              console.error(message)
            }
          }),
        )

        return { data: null }
      },
    }),
    getOpportunitiesUserData: build.query<
      null,
      Omit<GetOpportunityUserDataInput, 'opportunityId'>[]
    >({
      queryFn: async (queries, { dispatch, getState }) => {
        await Promise.allSettled(
          queries.map(async ({ accountId, defiType, defiProvider }) => {
            try {
              const opportunityIds = getOpportunityIds(
                { accountId, defiProvider, defiType },
                { getState },
              )

              if (!opportunityIds) {
                throw new Error("Can't select staking OpportunityIds")
              }

              const resolver = getOpportunitiesUserDataResolversByDefiProviderAndDefiType(
                defiProvider,
                defiType,
              )

              if (!resolver) {
                console.warn(`resolver for ${defiProvider}::${defiType} not implemented`)
                return
              }

              // TODO: collect and dispatch once to improve perf locally
              const onInvalidate = (userStakingId: UserStakingId) =>
                dispatch(opportunities.actions.invalidateUserStakingOpportunity(userStakingId))

              console.log({ opportunityIds, defiType, accountId }, 'in apiSlice')

              const resolved = await resolver({
                opportunityIds,
                defiType,
                accountId,
                reduxApi: { dispatch, getState },
                onInvalidate,
              })

              if (resolved?.data) {
                // TODO: collect and dispatch once to improve perf locally
                dispatch(opportunities.actions.upsertUserStakingOpportunities(resolved.data))
              }
              const byAccountId = {
                [accountId]: Object.keys(resolved?.data.byId ?? {}).map(
                  userStakingId => deserializeUserStakingId(userStakingId as UserStakingId)[1],
                ),
              } as OpportunityDataById

              const data = {
                byAccountId,
                type: defiType,
              }

              // TODO: collect and dispatch once to improve perf locally
              dispatch(opportunities.actions.upsertOpportunityAccounts(data))
            } catch (e) {
              const message = e instanceof Error ? e.message : 'Error getting opportunities data'
              console.error(message)
            }
          }),
        )

        return { data: null }
      },
    }),
  }),
})
