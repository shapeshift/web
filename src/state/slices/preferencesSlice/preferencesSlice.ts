import { createSlice } from '@reduxjs/toolkit'
import type { SupportedFiatCurrencies } from '@shapeshiftoss/market-service'
import { getConfig } from 'config'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import { simpleLocale } from 'lib/browserLocale'

dayjs.extend(localizedFormat)

export type FeatureFlags = {
  OsmosisSend: boolean
  OsmosisStaking: boolean
  OsmosisSwap: boolean
  OsmosisLP: boolean
  Optimism: boolean
  OptimismZrx: boolean
  ThorSwap: boolean
  Pendo: boolean
  IdleFinance: boolean
  Axelar: boolean
  Yat: boolean
  WalletConnectToDapps: boolean
  Wherever: boolean
  SaversVaults: boolean
  Yearn: boolean
  ArkeoAirdrop: boolean
  Cowswap: boolean
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
    OsmosisSend: getConfig().REACT_APP_FEATURE_OSMOSIS_SEND,
    OsmosisStaking: getConfig().REACT_APP_FEATURE_OSMOSIS_STAKING,
    OsmosisSwap: getConfig().REACT_APP_FEATURE_OSMOSIS_SWAP,
    OsmosisLP: getConfig().REACT_APP_FEATURE_OSMOSIS_LP,
    Optimism: getConfig().REACT_APP_FEATURE_OPTIMISM,
    OptimismZrx: getConfig().REACT_APP_FEATURE_OPTIMISM_ZRX,
    ThorSwap: getConfig().REACT_APP_FEATURE_THOR_SWAP,
    Pendo: getConfig().REACT_APP_FEATURE_PENDO,
    IdleFinance: getConfig().REACT_APP_FEATURE_IDLE,
    Axelar: getConfig().REACT_APP_FEATURE_AXELAR,
    Yat: getConfig().REACT_APP_FEATURE_YAT,
    WalletConnectToDapps: getConfig().REACT_APP_FEATURE_WALLET_CONNECT_TO_DAPPS,
    Wherever: getConfig().REACT_APP_FEATURE_WHEREVER,
    SaversVaults: getConfig().REACT_APP_FEATURE_SAVERS_VAULTS,
    Yearn: getConfig().REACT_APP_FEATURE_YEARN,
    ArkeoAirdrop: getConfig().REACT_APP_FEATURE_ARKEO_AIRDROP,
    Cowswap: getConfig().REACT_APP_FEATURE_COWSWAP,
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
