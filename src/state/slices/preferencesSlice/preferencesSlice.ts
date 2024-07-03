import { createSlice } from '@reduxjs/toolkit'
import { type AssetId } from '@shapeshiftoss/caip'
import type { HistoryTimeframe } from '@shapeshiftoss/types'
import { getConfig } from 'config'
import { DEFAULT_HISTORY_TIMEFRAME } from 'constants/Config'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import { simpleLocale } from 'lib/browserLocale'
import type { SupportedFiatCurrencies } from 'lib/market-service'

dayjs.extend(localizedFormat)

export type FeatureFlags = {
  Optimism: boolean
  BnbSmartChain: boolean
  Polygon: boolean
  Gnosis: boolean
  Arbitrum: boolean
  ArbitrumNova: boolean
  Base: boolean
  ThorSwap: boolean
  ThorSwapStreamingSwaps: boolean
  Yat: boolean
  WalletConnectToDapps: boolean
  WalletConnectToDappsV2: boolean
  Wherever: boolean
  SaversVaults: boolean
  SaversVaultsDeposit: boolean
  SaversVaultsWithdraw: boolean
  DefiDashboard: boolean
  Cowswap: boolean
  CowswapGnosis: boolean
  CowswapArbitrum: boolean
  ZrxSwap: boolean
  Mixpanel: boolean
  LifiSwap: boolean
  DynamicLpAssets: boolean
  ReadOnlyAssets: boolean
  Jaypegz: boolean
  OneInch: boolean
  ArbitrumBridge: boolean
  Portals: boolean
  CovalentJaypegs: boolean
  Chatwoot: boolean
  CoinbaseWallet: boolean
  AdvancedSlippage: boolean
  WalletConnectV2: boolean
  CustomSendNonce: boolean
  Snaps: boolean
  ThorchainLending: boolean
  ThorchainLendingBorrow: boolean
  ThorchainLendingRepay: boolean
  ThorchainLP: boolean
  ThorchainLpDeposit: boolean
  ThorchainLpWithdraw: boolean
  LedgerWallet: boolean
  ThorchainSwapLongtail: boolean
  ThorchainSwapL1ToLongtail: boolean
  ShapeShiftMobileWallet: boolean
  AccountManagement: boolean
  AccountManagementLedger: boolean
  RFOX: boolean
  RfoxRewardsTxHistory: boolean
}

export type Flag = keyof FeatureFlags

export enum CurrencyFormats {
  DotDecimalCommaThousands = 'en-US', // $123,456.78 (examples for a user using USD)
  DotDecimalCommaThousandsLakhCrore = 'en-IN', // $1,23,456.78
  DotDecimalQuoteThousands = 'de-CH', // $ 123’456.78
  CommaDecimalSpaceThousands = 'fr-FR', // 123 456,78 $US
  CommaDecimalDotThousands = 'de-DE', // 123.456,78 $
}

export const allowedDecimalSeparators = ['.', ',']

export enum HomeMarketView {
  TopAssets = 'TopAssets',
  Watchlist = 'Watchlist',
}

export type Preferences = {
  featureFlags: FeatureFlags
  selectedLocale: string
  balanceThreshold: string
  selectedCurrency: SupportedFiatCurrencies
  currencyFormat: CurrencyFormats
  chartTimeframe: HistoryTimeframe
  showWelcomeModal: boolean
  showConsentBanner: boolean
  showSnapsModal: boolean
  snapInstalled: boolean
  watchedAssets: AssetId[]
  selectedHomeView: HomeMarketView
}

const initialState: Preferences = {
  featureFlags: {
    Jaypegz: getConfig().REACT_APP_FEATURE_JAYPEGZ,
    Optimism: getConfig().REACT_APP_FEATURE_OPTIMISM,
    BnbSmartChain: getConfig().REACT_APP_FEATURE_BNBSMARTCHAIN,
    Polygon: getConfig().REACT_APP_FEATURE_POLYGON,
    Gnosis: getConfig().REACT_APP_FEATURE_GNOSIS,
    Arbitrum: getConfig().REACT_APP_FEATURE_ARBITRUM,
    ArbitrumNova: getConfig().REACT_APP_FEATURE_ARBITRUM_NOVA,
    Base: getConfig().REACT_APP_FEATURE_BASE,
    ThorSwap: getConfig().REACT_APP_FEATURE_THOR_SWAP,
    ThorSwapStreamingSwaps: getConfig().REACT_APP_FEATURE_THOR_SWAP_STREAMING_SWAPS,
    Yat: getConfig().REACT_APP_FEATURE_YAT,
    WalletConnectToDappsV2: getConfig().REACT_APP_FEATURE_WALLET_CONNECT_TO_DAPPS_V2,
    WalletConnectToDapps: getConfig().REACT_APP_FEATURE_WALLET_CONNECT_TO_DAPPS,
    Wherever: getConfig().REACT_APP_FEATURE_WHEREVER,
    SaversVaults: getConfig().REACT_APP_FEATURE_SAVERS_VAULTS,
    SaversVaultsDeposit: getConfig().REACT_APP_FEATURE_SAVERS_VAULTS_DEPOSIT,
    SaversVaultsWithdraw: getConfig().REACT_APP_FEATURE_SAVERS_VAULTS_WITHDRAW,
    DefiDashboard: getConfig().REACT_APP_FEATURE_DEFI_DASHBOARD,
    Cowswap: getConfig().REACT_APP_FEATURE_COWSWAP,
    CowswapGnosis: getConfig().REACT_APP_FEATURE_COWSWAP_GNOSIS,
    CowswapArbitrum: getConfig().REACT_APP_FEATURE_COWSWAP_ARBITRUM,
    ZrxSwap: getConfig().REACT_APP_FEATURE_ZRX_SWAP,
    LifiSwap: getConfig().REACT_APP_FEATURE_LIFI_SWAP,
    CovalentJaypegs: getConfig().REACT_APP_FEATURE_COVALENT_JAYPEGS,
    Mixpanel: getConfig().REACT_APP_FEATURE_MIXPANEL,
    DynamicLpAssets: getConfig().REACT_APP_FEATURE_DYNAMIC_LP_ASSETS,
    ReadOnlyAssets: getConfig().REACT_APP_FEATURE_READ_ONLY_ASSETS,
    OneInch: getConfig().REACT_APP_FEATURE_ONE_INCH,
    ArbitrumBridge: getConfig().REACT_APP_FEATURE_ARBITRUM_BRIDGE,
    Portals: getConfig().REACT_APP_FEATURE_PORTALS_SWAPPER,
    Chatwoot: getConfig().REACT_APP_FEATURE_CHATWOOT,
    CoinbaseWallet: getConfig().REACT_APP_FEATURE_COINBASE_WALLET,
    AdvancedSlippage: getConfig().REACT_APP_FEATURE_ADVANCED_SLIPPAGE,
    WalletConnectV2: getConfig().REACT_APP_FEATURE_WALLET_CONNECT_V2,
    CustomSendNonce: getConfig().REACT_APP_EXPERIMENTAL_CUSTOM_SEND_NONCE,
    Snaps: getConfig().REACT_APP_EXPERIMENTAL_MM_SNAPPY_FINGERS,
    ThorchainLending: getConfig().REACT_APP_FEATURE_THORCHAIN_LENDING,
    ThorchainLendingBorrow: getConfig().REACT_APP_FEATURE_THORCHAIN_LENDING_BORROW,
    ThorchainLendingRepay: getConfig().REACT_APP_FEATURE_THORCHAIN_LENDING_REPAY,
    ThorchainLP: getConfig().REACT_APP_FEATURE_THORCHAIN_LP,
    ThorchainLpDeposit: getConfig().REACT_APP_FEATURE_THORCHAIN_LP_DEPOSIT,
    ThorchainLpWithdraw: getConfig().REACT_APP_FEATURE_THORCHAIN_LP_WITHDRAW,
    LedgerWallet: getConfig().REACT_APP_FEATURE_LEDGER_WALLET,
    ThorchainSwapLongtail: getConfig().REACT_APP_FEATURE_THORCHAINSWAP_LONGTAIL,
    ThorchainSwapL1ToLongtail: getConfig().REACT_APP_FEATURE_THORCHAINSWAP_L1_TO_LONGTAIL,
    ShapeShiftMobileWallet: getConfig().REACT_APP_FEATURE_SHAPESHIFT_MOBILE_WALLET,
    AccountManagement: getConfig().REACT_APP_FEATURE_ACCOUNT_MANAGEMENT,
    AccountManagementLedger: getConfig().REACT_APP_FEATURE_ACCOUNT_MANAGEMENT_LEDGER,
    RFOX: getConfig().REACT_APP_FEATURE_RFOX,
    RfoxRewardsTxHistory: getConfig().REACT_APP_FEATURE_RFOX_REWARDS_TX_HISTORY,
  },
  selectedLocale: simpleLocale(),
  balanceThreshold: '0',
  selectedCurrency: 'USD',
  currencyFormat: CurrencyFormats.DotDecimalCommaThousands,
  chartTimeframe: DEFAULT_HISTORY_TIMEFRAME,
  showWelcomeModal: false,
  showConsentBanner: true,
  showSnapsModal: true,
  snapInstalled: false,
  watchedAssets: [],
  selectedHomeView: HomeMarketView.TopAssets,
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
    setChartTimeframe(state, { payload }: { payload: { timeframe: HistoryTimeframe } }) {
      state.chartTimeframe = payload.timeframe
    },
    setWelcomeModal(state, { payload }: { payload: { show: boolean } }) {
      state.showWelcomeModal = payload.show
    },
    setShowConsentBanner(state, { payload }: { payload: boolean }) {
      state.showConsentBanner = payload
    },
    setShowSnapsModal(state, { payload }: { payload: boolean }) {
      state.showSnapsModal = payload
    },
    setSnapInstalled(state, { payload }: { payload: boolean }) {
      state.snapInstalled = payload
    },
    addWatchedAssetId(state, { payload }: { payload: AssetId }) {
      state.watchedAssets = state.watchedAssets.concat(payload)
    },
    removeWatchedAssetId(state, { payload }: { payload: AssetId }) {
      state.watchedAssets = state.watchedAssets.filter(assetId => assetId !== payload)
    },
    setHomeMarketView(state, { payload }: { payload: HomeMarketView }) {
      state.selectedHomeView = payload
    },
  },
})
