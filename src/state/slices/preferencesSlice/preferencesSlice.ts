import { createSlice } from '@reduxjs/toolkit'
import { SupportedFiatCurrencies } from '@shapeshiftoss/market-service'
import { getConfig } from 'config'
import { simpleLocale } from 'lib/browserLocale'

export type FeatureFlags = {
  Osmosis: boolean
  CoinbasePay: boolean
}

export type Flag = keyof FeatureFlags

export type Preferences = {
  featureFlags: FeatureFlags
  selectedLocale: string
  balanceThreshold: string
  selectedCurrency: SupportedFiatCurrencies
}

const initialState: Preferences = {
  featureFlags: {
    Osmosis: getConfig().REACT_APP_FEATURE_OSMOSIS,
    CoinbasePay: getConfig().REACT_APP_FEATURE_COINBASE_RAMP,
  },
  selectedLocale: simpleLocale(),
  balanceThreshold: '0',
  selectedCurrency: 'USD',
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
    setSelectedCurrency(state, { payload }: { payload: { currency: SupportedFiatCurrencies } }) {
      state.selectedCurrency = payload.currency
    },
    setBalanceThreshold(state, { payload }: { payload: { threshold: string } }) {
      state.balanceThreshold = payload.threshold
    },
  },
})
