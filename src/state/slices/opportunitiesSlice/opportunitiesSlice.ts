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
  name: 'opportunitiesData',
  initialState,
  reducers: {
    clear: () => initialState,
    upsertOpportunitiesMetadata: {
      reducer: (draftState, { payload }: { payload: GetOpportunityMetadataOutput }) => {
        draftState[payload.type].byId = Object.assign(draftState[payload.type].byId, payload.byId)
        draftState[payload.type].ids = Object.keys(draftState[payload.type].byId)
      },
      // Use the `prepareAutoBatched` utility to automatically
      // add the `action.meta[SHOULD_AUTOBATCH]` field the enhancer needs
      prepare: prepareAutoBatched<GetOpportunityMetadataOutput>(),
    },
    upsertOpportunityAccounts: {
      reducer: (draftState, { payload }: { payload: GetOpportunityUserDataOutput }) => {
        draftState[payload.type].byAccountId = Object.assign(
          draftState[payload.type].byAccountId,
          payload.byAccountId,
        )
      },
      // Use the `prepareAutoBatched` utility to automatically
      // add the `action.meta[SHOULD_AUTOBATCH]` field the enhancer needs
      prepare: prepareAutoBatched<GetOpportunityUserDataOutput>(),
    },
    upsertUserStakingOpportunities: {
      reducer: (draftState, { payload }: { payload: GetOpportunityUserStakingDataOutput }) => {
        draftState.userStaking.byId = Object.assign(draftState.userStaking.byId, payload.byId)
        draftState.userStaking.ids = Object.keys(draftState.userStaking.byId) as UserStakingId[]
      },

      // Use the `prepareAutoBatched` utility to automatically
      // add the `action.meta[SHOULD_AUTOBATCH]` field the enhancer needs
      prepare: prepareAutoBatched<GetOpportunityUserStakingDataOutput>(),
    },
    invalidateUserStakingOpportunity: {
      reducer: (draftState, { payload }: { payload: UserStakingId }) => {
        const userStakingId = payload
        delete draftState.userStaking.byId[userStakingId]
      },

      // Use the `prepareAutoBatched` utility to automatically
      // add the `action.meta[SHOULD_AUTOBATCH]` field the enhancer needs
      prepare: prepareAutoBatched<UserStakingId>(),
    },
  },
  extraReducers: builder => builder.addCase(PURGE, () => initialState),
})
