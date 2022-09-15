import { createSlice } from '@reduxjs/toolkit'
import type { SupportedFiatCurrencies } from '@shapeshiftoss/market-service'
import { getConfig } from 'config'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import { simpleLocale } from 'lib/browserLocale'

dayjs.extend(localizedFormat)

export type FeatureFlags = {
  Osmosis: boolean
  FoxLP: boolean
  FoxFarming: boolean
  Avalanche: boolean
  Thorchain: boolean
  ThorSwap: boolean
  CowSwap: boolean
  Pendo: boolean
  IdleFinance: boolean
  Axelar: boolean
  Zendesk: boolean
  MtPelerinFiatRamp: boolean
  Yat: boolean
  RainbowCharts: boolean
  MultiAccounts: boolean
  SwapperV2: boolean
  WalletConnectToDapps: boolean
}

export type Flag = keyof FeatureFlags

export enum CurrencyFormats {
  DotDecimal = 'en-US',
  CommaDecimal = 'fr-FR',
}

export type Preferences = {
  featureFlags: FeatureFlags
  selectedLocale: string
  balanceThreshold: string
  selectedCurrency: SupportedFiatCurrencies
  currencyFormat: CurrencyFormats
  showWelcomeModal: boolean
}

const initialState: Preferences = {
  featureFlags: {
    Osmosis: getConfig().REACT_APP_FEATURE_OSMOSIS,
    FoxLP: getConfig().REACT_APP_FEATURE_FOX_LP,
    FoxFarming: getConfig().REACT_APP_FEATURE_FOX_FARMING,
    Avalanche: getConfig().REACT_APP_FEATURE_AVALANCHE,
    Thorchain: getConfig().REACT_APP_FEATURE_THORCHAIN,
    ThorSwap: getConfig().REACT_APP_FEATURE_THOR_SWAP,
    CowSwap: getConfig().REACT_APP_FEATURE_COWSWAP,
    Pendo: getConfig().REACT_APP_FEATURE_PENDO,
    IdleFinance: getConfig().REACT_APP_FEATURE_IDLE,
    Axelar: getConfig().REACT_APP_FEATURE_AXELAR,
    Zendesk: getConfig().REACT_APP_FEATURE_ZENDESK,
    MtPelerinFiatRamp: getConfig().REACT_APP_FEATURE_MTPELERIN_FIAT_RAMP,
    Yat: getConfig().REACT_APP_FEATURE_YAT,
    RainbowCharts: getConfig().REACT_APP_FEATURE_RAINBOW_CHARTS,
    MultiAccounts: getConfig().REACT_APP_FEATURE_MULTI_ACCOUNTS,
    SwapperV2: getConfig().REACT_APP_FEATURE_SWAPPER_V2,
    WalletConnectToDapps: getConfig().REACT_APP_FEATURE_WALLET_CONNECT_TO_DAPPS,
  },
  selectedLocale: simpleLocale(),
  balanceThreshold: '0',
  selectedCurrency: 'USD',
  currencyFormat: CurrencyFormats.DotDecimal,
  showWelcomeModal: false,
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
    setCurrencyFormat(state, { payload }: { payload: { currencyFormat: CurrencyFormats } }) {
      state.currencyFormat = payload.currencyFormat
    },
    setWelcomeModal(state, { payload }: { payload: { show: boolean } }) {
      state.showWelcomeModal = payload.show
    },
  },
})
