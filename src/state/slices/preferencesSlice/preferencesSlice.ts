import { createSlice } from '@reduxjs/toolkit'
import { simpleLocale } from 'lib/browserLocale'

import { getConfig } from '../../../config'

export type FeatureFlags = {
  FoxyInvestor: boolean
  ReduxLogging: boolean
  KeepKeySettings: boolean
  WalletMigration: boolean
  DemoWallet: boolean
  WalletConnectWallet: boolean
}

export type Flag = keyof FeatureFlags

export type Preferences = {
  featureFlags: FeatureFlags
  selectedLocale: string
  balanceThreshold: string
}

const initialState: Preferences = {
  featureFlags: {
    FoxyInvestor: getConfig().REACT_APP_FEATURE_FOXY_INVESTOR,
    ReduxLogging: getConfig().REACT_APP_REDUX_LOGGING,
    KeepKeySettings: getConfig().REACT_APP_FEATURE_KEEPKEY_SETTINGS,
    WalletMigration: getConfig().REACT_APP_FEATURE_WALLET_MIGRATION,
    DemoWallet: getConfig().REACT_APP_FEATURE_DEMO_WALLET,
    WalletConnectWallet: getConfig().REACT_APP_FEATURE_WALLETCONNECT_WALLET,
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
