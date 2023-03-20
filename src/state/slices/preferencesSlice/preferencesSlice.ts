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
  OsmosisLPAdditionalPools: boolean
  Optimism: boolean
  BnbSmartChain: boolean
  ThorSwap: boolean
  IdleFinance: boolean
  IdleFinanceDeposits: boolean
  Axelar: boolean
  Yat: boolean
  WalletConnectToDapps: boolean
  WalletConnectToDappsV2: boolean
  Wherever: boolean
  SaversVaults: boolean
  Yearn: boolean
  DefiDashboard: boolean
  ArkeoAirdrop: boolean
  TradeRates: boolean
  Cowswap: boolean
  ZrxAvalancheSwap: boolean
  ZrxBnbSmartChain: boolean
  ZrxEthereumSwap: boolean
  ZrxOptimismSwap: boolean
  Mixpanel: boolean
  LiveSupport: boolean
  LifiSwap: boolean
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
  showConsentBanner: boolean
}

const initialState: Preferences = {
  featureFlags: {
    OsmosisSend: getConfig().REACT_APP_FEATURE_OSMOSIS_SEND,
    OsmosisStaking: getConfig().REACT_APP_FEATURE_OSMOSIS_STAKING,
    OsmosisSwap: getConfig().REACT_APP_FEATURE_OSMOSIS_SWAP,
    OsmosisLP: getConfig().REACT_APP_FEATURE_OSMOSIS_LP,
    OsmosisLPAdditionalPools: getConfig().REACT_APP_FEATURE_OSMOSIS_LP_ADDITIONAL_POOLS,
    Optimism: getConfig().REACT_APP_FEATURE_OPTIMISM,
    BnbSmartChain: getConfig().REACT_APP_FEATURE_BNBSMARTCHAIN,
    ThorSwap: getConfig().REACT_APP_FEATURE_THOR_SWAP,
    IdleFinance: getConfig().REACT_APP_FEATURE_IDLE,
    IdleFinanceDeposits: getConfig().REACT_APP_FEATURE_IDLE_DEPOSITS,
    Axelar: getConfig().REACT_APP_FEATURE_AXELAR,
    Yat: getConfig().REACT_APP_FEATURE_YAT,
    WalletConnectToDapps: getConfig().REACT_APP_FEATURE_WALLET_CONNECT_TO_DAPPS,
    WalletConnectToDappsV2: getConfig().REACT_APP_FEATURE_WALLET_CONNECT_TO_DAPPS_V2,
    Wherever: getConfig().REACT_APP_FEATURE_WHEREVER,
    SaversVaults: getConfig().REACT_APP_FEATURE_SAVERS_VAULTS,
    Yearn: getConfig().REACT_APP_FEATURE_YEARN,
    DefiDashboard: getConfig().REACT_APP_FEATURE_DEFI_DASHBOARD,
    ArkeoAirdrop: getConfig().REACT_APP_FEATURE_ARKEO_AIRDROP,
    TradeRates: getConfig().REACT_APP_FEATURE_TRADE_RATES,
    Cowswap: getConfig().REACT_APP_FEATURE_COWSWAP,
    ZrxAvalancheSwap: getConfig().REACT_APP_FEATURE_ZRX_AVALANCHE_SWAP,
    ZrxBnbSmartChain: getConfig().REACT_APP_FEATURE_ZRX_BNBSMARTCHAIN,
    ZrxEthereumSwap: getConfig().REACT_APP_FEATURE_ZRX_ETHEREUM_SWAP,
    ZrxOptimismSwap: getConfig().REACT_APP_FEATURE_ZRX_OPTIMISM,
    LifiSwap: getConfig().REACT_APP_FEATURE_LIFI_SWAP,
    Mixpanel: getConfig().REACT_APP_FEATURE_MIXPANEL,
    LiveSupport: getConfig().REACT_APP_FEATURE_LIVESUPPORT,
  },
  selectedLocale: simpleLocale(),
  balanceThreshold: '0',
  selectedCurrency: 'USD',
  currencyFormat: CurrencyFormats.DotDecimal,
  showWelcomeModal: false,
  showConsentBanner: true,
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
    setShowConsentBanner(state, { payload }: { payload: boolean }) {
      state.showConsentBanner = payload
    },
  },
})
