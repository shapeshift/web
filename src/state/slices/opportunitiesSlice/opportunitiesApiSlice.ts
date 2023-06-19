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
  GetOpportunityMetadataOutput,
  GetOpportunityUserDataInput,
  GetOpportunityUserDataOutput,
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
    getOpportunityMetadata: build.query<GetOpportunityMetadataOutput, GetOpportunityMetadataInput>({
      queryFn: async ({ opportunityId, defiType, defiProvider }, { dispatch, getState }) => {
        try {
          const resolver = getMetadataResolversByDefiProviderAndDefiType(defiProvider, defiType)

          if (!resolver) {
            throw new Error(`resolver for ${defiProvider}::${defiType} not implemented`)
          }

          const resolved = await resolver({
            opportunityId,
            defiType,
            reduxApi: { dispatch, getState },
          })

          dispatch(opportunities.actions.upsertOpportunitiesMetadata(resolved.data))

          return { data: resolved.data }
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Error getting opportunity metadata'
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
      queryFn: async ({ defiType, defiProvider }, { dispatch, getState }) => {
        try {
          const opportunityIds = getOpportunityIds({ defiProvider, defiType }, { getState })

          const resolver = getOpportunitiesMetadataResolversByDefiProviderAndDefiType(
            defiProvider,
            defiType,
          )

          if (!resolver) {
            throw new Error(`resolver for ${defiProvider}::${defiType} not implemented`)
          }

          const resolved = await resolver({
            opportunityIds,
            defiType,
            reduxApi: { dispatch, getState },
          })

          dispatch(opportunities.actions.upsertOpportunitiesMetadata(resolved.data))

          return { data: resolved.data }
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Error getting opportunities metadata'
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
        { accountId, opportunityId, defiType, defiProvider },
        { dispatch, getState },
      ) => {
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
    getOpportunitiesUserData: build.query<
      GetOpportunityUserDataOutput,
      Omit<GetOpportunityUserDataInput, 'opportunityId'>
    >({
      queryFn: async ({ accountId, defiType, defiProvider }, { dispatch, getState }) => {
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
            throw new Error(`resolver for ${defiProvider}::${defiType} not implemented`)
          }

          const onInvalidate = (userStakingId: UserStakingId) =>
            dispatch(opportunities.actions.invalidateUserStakingOpportunity(userStakingId))

          const resolved = await resolver({
            opportunityIds,
            defiType,
            accountId,
            reduxApi: { dispatch, getState },
            onInvalidate,
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
            type: defiType,
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
