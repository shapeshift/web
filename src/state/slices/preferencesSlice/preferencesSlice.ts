import { createSlice } from '@reduxjs/toolkit'

import { getConfig } from '../../../config'

export type FeatureFlags = {
  CosmosInvestor: boolean
  CosmosPlugin: boolean
  GemRamp: boolean
  ReduxLogging: boolean
}

export type Preferences = {
  featureFlags: FeatureFlags
}

const initialState: Preferences = {
  featureFlags: {
    CosmosInvestor: getConfig().REACT_APP_FEATURE_COSMOS_INVESTOR,
    CosmosPlugin: getConfig().REACT_APP_FEATURE_PLUGIN_COSMOS,
    GemRamp: getConfig().REACT_APP_FEATURE_GEM_RAMP,
    ReduxLogging: getConfig().REACT_APP_REDUX_LOGGING
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
