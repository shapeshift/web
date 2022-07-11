import { createSlice } from '@reduxjs/toolkit'
import { SupportedFiatCurrencies } from '@shapeshiftoss/market-service'
import { getConfig } from 'config'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import { simpleLocale } from 'lib/browserLocale'

dayjs.extend(localizedFormat)

export type FeatureFlags = {
  Osmosis: boolean
  Avalanche: boolean
  CoinbasePay: boolean
  Thor: boolean
  JunoPay: boolean
  Pendo: boolean
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
    Avalanche: getConfig().REACT_APP_FEATURE_AVALANCHE,
    CoinbasePay: getConfig().REACT_APP_FEATURE_COINBASE_RAMP,
    Thor: getConfig().REACT_APP_FEATURE_THOR,
    JunoPay: getConfig().REACT_APP_FEATURE_JUNOPAY,
    Pendo: getConfig().REACT_APP_FEATURE_PENDO,
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
      require(`dayjs/locale/${payload.locale}.js`)

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
