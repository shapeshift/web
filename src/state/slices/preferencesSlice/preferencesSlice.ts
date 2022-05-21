import { createSlice } from '@reduxjs/toolkit'
import { simpleLocale } from 'lib/browserLocale'

import { getConfig } from '../../../config'

export type FeatureFlags = {
  Osmosis: boolean
  ReduxLogging: boolean
  WalletMigration: boolean
  BanxaRamp: boolean
  FoxPage: boolean
}

export type Flag = keyof FeatureFlags

export type Preferences = {
  featureFlags: FeatureFlags
  selectedLocale: string
  balanceThreshold: string
}

const initialState: Preferences = {
  featureFlags: {
    Osmosis: getConfig().REACT_APP_OSMOSIS,
    ReduxLogging: getConfig().REACT_APP_REDUX_LOGGING,
    WalletMigration: getConfig().REACT_APP_FEATURE_WALLET_MIGRATION,
    BanxaRamp: getConfig().REACT_APP_FEATURE_BANXA_RAMP,
    FoxPage: getConfig().REACT_APP_FEATURE_FOX_PAGE,
  },
  selectedLocale: simpleLocale(),
  balanceThreshold: '0',
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
    },
  },
})
