import { createSlice, prepareAutoBatched } from '@reduxjs/toolkit'
import { PURGE } from 'redux-persist'

import type {
  GetOpportunityMetadataOutput,
  GetOpportunityUserDataOutput,
  GetOpportunityUserStakingDataOutput,
  OpportunitiesState,
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
  name: 'opportunities',
  initialState,
  reducers: create => ({
    clear: create.reducer(() => initialState),

    upsertOpportunitiesMetadata: create.preparedReducer(
      prepareAutoBatched<GetOpportunityMetadataOutput>(),
      (draftState, { payload }: { payload: GetOpportunityMetadataOutput }) => {
        draftState[payload.type].byId = Object.assign(draftState[payload.type].byId, payload.byId)
        draftState[payload.type].ids = Object.keys(draftState[payload.type].byId)
      },
    ),
    upsertOpportunityAccounts: create.preparedReducer(
      prepareAutoBatched<GetOpportunityUserDataOutput>(),
      (draftState, { payload }: { payload: GetOpportunityUserDataOutput }) => {
        if (!draftState[payload.type].byAccountId) {
          draftState[payload.type].byAccountId = {}
        }

        Object.keys(payload.byAccountId).forEach(accountId => {
          if (!draftState[payload.type].byAccountId[accountId]) {
            draftState[payload.type].byAccountId[accountId] = []
          }

          draftState[payload.type].byAccountId[accountId] = [
            ...(draftState[payload.type].byAccountId[accountId] ?? []),
            ...(payload.byAccountId[accountId] ?? []),
          ]
        })
      },
    ),
    upsertUserStakingOpportunities: create.preparedReducer(
      prepareAutoBatched<GetOpportunityUserStakingDataOutput>(),
      (draftState, { payload }: { payload: GetOpportunityUserStakingDataOutput }) => {
        draftState.userStaking.byId = Object.assign(draftState.userStaking.byId, payload.byId)
        draftState.userStaking.ids = Object.keys(draftState.userStaking.byId) as UserStakingId[]
      },
    ),
    invalidateUserStakingOpportunity: create.preparedReducer(
      prepareAutoBatched<UserStakingId>(),
      (draftState, { payload }: { payload: UserStakingId }) => {
        const userStakingId = payload
        delete draftState.userStaking.byId[userStakingId]
      },
    ),
  }),
  selectors: {
    selectLpOpportunitiesById: state => state.lp.byId,
    selectStakingOpportunitiesById: state => state.staking.byId,
    selectUserStakingIds: state => state.userStaking.ids,
    selectStakingByAccountId: state => state.staking.byAccountId,
    selectUserStakingOpportunitiesById: state => state.userStaking.byId,
    selectStakingIds: state => state.staking.ids,
  },
  extraReducers: builder => builder.addCase(PURGE, () => initialState),
})
