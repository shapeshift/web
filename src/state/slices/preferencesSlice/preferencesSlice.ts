import { createSlice } from '@reduxjs/toolkit'
import { simpleLocale } from 'lib/browserLocale'

import { getConfig } from '../../../config'

export type FeatureFlags = {
  CosmosInvestor: boolean
  CosmosPlugin: boolean
  FoxyInvestor: boolean
  GemRamp: boolean
  ReduxLogging: boolean
  KeepKeySettings: boolean
}

export type Preferences = {
  featureFlags: FeatureFlags
  selectedLocale: string
  balanceThreshold: string
}

const initialState: Preferences = {
  featureFlags: {
    CosmosInvestor: getConfig().REACT_APP_FEATURE_COSMOS_INVESTOR,
    CosmosPlugin: getConfig().REACT_APP_FEATURE_PLUGIN_COSMOS,
    GemRamp: getConfig().REACT_APP_FEATURE_GEM_RAMP,
    FoxyInvestor: getConfig().REACT_APP_FEATURE_FOXY_INVESTOR,
    ReduxLogging: getConfig().REACT_APP_REDUX_LOGGING,
    KeepKeySettings: getConfig().REACT_APP_KEEP_KEY_SETTINGS
  },
  selectedLocale: simpleLocale(),
  balanceThreshold: '0'
}

export const preferences = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    clearFeatureFlags: state => {
      state.featureFlags = initialState.featureFlags
    },
    setFeatureFlag(state, { payload }: { payload: { flag: keyof FeatureFlags; value: boolean } }) {
      state.featureFlags[payload.flag] = payload.value
    },
    setSelectedLocale(state, { payload }: { payload: { locale: string } }) {
      state.selectedLocale = payload.locale
    },
    setBalanceThreshold(state, { payload }: { payload: { threshold: string } }) {
      state.balanceThreshold = payload.threshold
    }
  }
})
