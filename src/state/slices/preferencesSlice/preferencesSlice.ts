import { createSlice } from '@reduxjs/toolkit'

import { getConfig } from '../../../config'

export type FeatureFlags = {
  CosmosInvestor: boolean
  CosmosPlugin: boolean
}

export type Preferences = {
  featureFlags: FeatureFlags
}

const initialState: Preferences = {
  // TODO(0xdef1cafe): this whole thing needs to be deleted once we have the account -> address abstraction
  featureFlags: {
    CosmosInvestor: getConfig().REACT_APP_FEATURE_COSMOS_INVESTOR,
    CosmosPlugin: getConfig().REACT_APP_FEATURE_PLUGIN_COSMOS
  }
}

export const preferences = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    clear: () => initialState,
    setFeatureFlag(state, { payload }: { payload: { flag: keyof FeatureFlags; value: boolean } }) {
      state.featureFlags[payload.flag] = payload.value
    }
  }
})
