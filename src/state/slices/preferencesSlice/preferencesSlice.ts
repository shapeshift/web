import { createSlice } from '@reduxjs/toolkit'

import { getConfig } from '../../../config'

export type FeatureFlags = {
  Yearn: boolean
  CosmosInvestor: boolean
  BitcoinPlugin: boolean
  CosmosPlugin: boolean
}

export type Preferences = {
  featureFlags: FeatureFlags
}

const initialState: Preferences = {
  // TODO(0xdef1cafe): this whole thing needs to be deleted once we have the account -> address abstraction
  featureFlags: {
    Yearn: getConfig().REACT_APP_FEATURE_YEARN,
    CosmosInvestor: getConfig().REACT_APP_FEATURE_COSMOS_INVESTOR,
    BitcoinPlugin: getConfig().REACT_APP_FEATURE_PLUGIN_BITCOIN,
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
