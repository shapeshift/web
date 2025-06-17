import { createSlice } from '@reduxjs/toolkit'
import type { AssetId } from '@shapeshiftoss/caip'
import type { HistoryTimeframe } from '@shapeshiftoss/types'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'

import { getConfig } from '@/config'
import { DEFAULT_HISTORY_TIMEFRAME } from '@/constants/Config'
import { simpleLocale } from '@/lib/browserLocale'
import type { SupportedFiatCurrencies } from '@/lib/market-service'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'

dayjs.extend(localizedFormat)

export type FeatureFlags = {
  Optimism: boolean
  BnbSmartChain: boolean
  Polygon: boolean
  Gnosis: boolean
  Arbitrum: boolean
  ArbitrumNova: boolean
  Solana: boolean
  Base: boolean
  Mayachain: boolean
  ThorSwap: boolean
  WalletConnectToDapps: boolean
  WalletConnectToDappsV2: boolean
  SaversVaults: boolean
  SaversVaultsDeposit: boolean
  SaversVaultsWithdraw: boolean
  Cowswap: boolean
  ZrxSwap: boolean
  Mixpanel: boolean
  DynamicLpAssets: boolean
  ReadOnlyAssets: boolean
  ArbitrumBridge: boolean
  PortalsSwap: boolean
  Chatwoot: boolean
  AdvancedSlippage: boolean
  WalletConnectV2: boolean
  CustomSendNonce: boolean
  ThorchainLending: boolean
  ThorchainLendingBorrow: boolean
  ThorchainLendingRepay: boolean
  ThorchainLP: boolean
  ThorchainLpDeposit: boolean
  ThorchainLpWithdraw: boolean
  LedgerWallet: boolean
  ThorchainSwapLongtail: boolean
  ThorchainSwapL1ToLongtail: boolean
  AccountManagement: boolean
  AccountManagementLedger: boolean
  RFOX: boolean
  RFOX_LP: boolean
  CustomTokenImport: boolean
  ArbitrumBridgeClaims: boolean
  UsdtApprovalReset: boolean
  RunePool: boolean
  RunePoolDeposit: boolean
  RunePoolWithdraw: boolean
  Markets: boolean
  PhantomWallet: boolean
  FoxPage: boolean
  FoxPageRFOX: boolean
  FoxPageFoxSection: boolean
  FoxPageFoxFarmingSection: boolean
  FoxPageGovernance: boolean
  LimitOrders: boolean
  ChainflipSwap: boolean
  SolanaSwapper: boolean
  ChainflipDca: boolean
  JupiterSwap: boolean
  NewWalletFlow: boolean
  NewLimitFlow: boolean
  ThorchainSwapperVolatilityAck: boolean
  RelaySwapper: boolean
  ActionCenter: boolean
  ThorchainTcy: boolean
  ThorchainTcyWidget: boolean
  ThorchainTcyActivity: boolean
  MayaSwap: boolean
}

export type Flag = keyof FeatureFlags

export enum CurrencyFormats {
  DotDecimalCommaThousands = 'en-US', // $123,456.78 (examples for a user using USD)
  DotDecimalCommaThousandsLakhCrore = 'en-IN', // $1,23,456.78
  DotDecimalQuoteThousands = 'de-CH', // $ 123'456.78
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
    Optimism: getConfig().VITE_FEATURE_OPTIMISM,
    BnbSmartChain: getConfig().VITE_FEATURE_BNBSMARTCHAIN,
    Polygon: getConfig().VITE_FEATURE_POLYGON,
    Gnosis: getConfig().VITE_FEATURE_GNOSIS,
    Arbitrum: getConfig().VITE_FEATURE_ARBITRUM,
    ArbitrumNova: getConfig().VITE_FEATURE_ARBITRUM_NOVA,
    Solana: getConfig().VITE_FEATURE_SOLANA,
    Base: getConfig().VITE_FEATURE_BASE,
    Mayachain: getConfig().VITE_FEATURE_MAYACHAIN,
    ThorSwap: getConfig().VITE_FEATURE_THOR_SWAP,
    WalletConnectToDappsV2: getConfig().VITE_FEATURE_WALLET_CONNECT_TO_DAPPS_V2,
    WalletConnectToDapps: getConfig().VITE_FEATURE_WALLET_CONNECT_TO_DAPPS,
    SaversVaults: getConfig().VITE_FEATURE_SAVERS_VAULTS,
    SaversVaultsDeposit: getConfig().VITE_FEATURE_SAVERS_VAULTS_DEPOSIT,
    SaversVaultsWithdraw: getConfig().VITE_FEATURE_SAVERS_VAULTS_WITHDRAW,
    Cowswap: getConfig().VITE_FEATURE_COWSWAP,
    ZrxSwap: getConfig().VITE_FEATURE_ZRX_SWAP,
    Mixpanel: getConfig().VITE_FEATURE_MIXPANEL,
    DynamicLpAssets: getConfig().VITE_FEATURE_DYNAMIC_LP_ASSETS,
    ReadOnlyAssets: getConfig().VITE_FEATURE_READ_ONLY_ASSETS,
    ArbitrumBridge: getConfig().VITE_FEATURE_ARBITRUM_BRIDGE,
    PortalsSwap: getConfig().VITE_FEATURE_PORTALS_SWAPPER,
    Chatwoot: getConfig().VITE_FEATURE_CHATWOOT,
    AdvancedSlippage: getConfig().VITE_FEATURE_ADVANCED_SLIPPAGE,
    WalletConnectV2: getConfig().VITE_FEATURE_WALLET_CONNECT_V2,
    CustomSendNonce: getConfig().VITE_EXPERIMENTAL_CUSTOM_SEND_NONCE,
    ThorchainLending: getConfig().VITE_FEATURE_THORCHAIN_LENDING,
    ThorchainLendingBorrow: getConfig().VITE_FEATURE_THORCHAIN_LENDING_BORROW,
    ThorchainLendingRepay: getConfig().VITE_FEATURE_THORCHAIN_LENDING_REPAY,
    ThorchainLP: getConfig().VITE_FEATURE_THORCHAIN_LP,
    ThorchainLpDeposit: getConfig().VITE_FEATURE_THORCHAIN_LP_DEPOSIT,
    ThorchainLpWithdraw: getConfig().VITE_FEATURE_THORCHAIN_LP_WITHDRAW,
    LedgerWallet: getConfig().VITE_FEATURE_LEDGER_WALLET,
    ThorchainSwapLongtail: getConfig().VITE_FEATURE_THORCHAINSWAP_LONGTAIL,
    ThorchainSwapL1ToLongtail: getConfig().VITE_FEATURE_THORCHAINSWAP_L1_TO_LONGTAIL,
    AccountManagement: getConfig().VITE_FEATURE_ACCOUNT_MANAGEMENT,
    AccountManagementLedger: getConfig().VITE_FEATURE_ACCOUNT_MANAGEMENT_LEDGER,
    RFOX: getConfig().VITE_FEATURE_RFOX,
    RFOX_LP: getConfig().VITE_FEATURE_RFOX_LP,
    CustomTokenImport: getConfig().VITE_FEATURE_CUSTOM_TOKEN_IMPORT,
    ArbitrumBridgeClaims: getConfig().VITE_FEATURE_ARBITRUM_BRIDGE_CLAIMS,
    UsdtApprovalReset: getConfig().VITE_FEATURE_USDT_APPROVAL_RESET,
    RunePool: getConfig().VITE_FEATURE_RUNEPOOL,
    RunePoolDeposit: getConfig().VITE_FEATURE_RUNEPOOL_DEPOSIT,
    RunePoolWithdraw: getConfig().VITE_FEATURE_RUNEPOOL_WITHDRAW,
    Markets: getConfig().VITE_FEATURE_MARKETS,
    PhantomWallet: getConfig().VITE_FEATURE_PHANTOM_WALLET,
    FoxPage: getConfig().VITE_FEATURE_FOX_PAGE,
    FoxPageRFOX: getConfig().VITE_FEATURE_FOX_PAGE_RFOX,
    FoxPageFoxSection: getConfig().VITE_FEATURE_FOX_PAGE_FOX_SECTION,
    FoxPageFoxFarmingSection: getConfig().VITE_FEATURE_FOX_PAGE_FOX_FARMING_SECTION,
    FoxPageGovernance: getConfig().VITE_FEATURE_FOX_PAGE_GOVERNANCE,
    LimitOrders: getConfig().VITE_FEATURE_LIMIT_ORDERS,
    ChainflipSwap: getConfig().VITE_FEATURE_CHAINFLIP_SWAP,
    ChainflipDca: getConfig().VITE_FEATURE_CHAINFLIP_SWAP_DCA,
    SolanaSwapper: getConfig().VITE_FEATURE_SWAPPER_SOLANA,
    JupiterSwap: getConfig().VITE_FEATURE_JUPITER_SWAP,
    NewWalletFlow: getConfig().VITE_FEATURE_NEW_WALLET_FLOW,
    NewLimitFlow: getConfig().VITE_FEATURE_NEW_LIMIT_FLOW,
    ThorchainSwapperVolatilityAck: getConfig().VITE_FEATURE_THORCHAIN_SWAPPER_ACK,
    RelaySwapper: getConfig().VITE_FEATURE_SWAPPER_RELAY,
    ActionCenter: getConfig().VITE_FEATURE_ACTION_CENTER,
    ThorchainTcy: getConfig().VITE_FEATURE_THORCHAIN_TCY,
    ThorchainTcyWidget: getConfig().VITE_FEATURE_THORCHAIN_TCY_WIDGET,
    ThorchainTcyActivity: getConfig().VITE_FEATURE_THORCHAIN_TCY_ACTIVITY,
    MayaSwap: getConfig().VITE_FEATURE_MAYA_SWAP,
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
  reducers: create => ({
    clearFeatureFlags: create.reducer(state => {
      state.featureFlags = initialState.featureFlags
    }),
    setFeatureFlag: create.reducer(
      (state, { payload }: { payload: { flag: keyof FeatureFlags; value: boolean } }) => {
        state.featureFlags[payload.flag] = payload.value
      },
    ),
    setSelectedLocale: create.reducer((state, { payload }: { payload: { locale: string } }) => {
      state.selectedLocale = payload.locale
    }),
    setSelectedCurrency: create.reducer(
      (state, { payload }: { payload: { currency: SupportedFiatCurrencies } }) => {
        state.selectedCurrency = payload.currency
      },
    ),

    setBalanceThreshold: create.reducer(
      (state, { payload }: { payload: { threshold: string } }) => {
        state.balanceThreshold = payload.threshold
      },
    ),
    setCurrencyFormat: create.reducer(
      (state, { payload }: { payload: { currencyFormat: CurrencyFormats } }) => {
        state.currencyFormat = payload.currencyFormat
      },
    ),

    setChartTimeframe: create.reducer(
      (state, { payload }: { payload: { timeframe: HistoryTimeframe } }) => {
        state.chartTimeframe = payload.timeframe
      },
    ),
    setWelcomeModal: create.reducer((state, { payload }: { payload: { show: boolean } }) => {
      state.showWelcomeModal = payload.show
    }),
    setShowConsentBanner: create.reducer((state, { payload }: { payload: boolean }) => {
      state.showConsentBanner = payload
    }),
    setShowSnapsModal: create.reducer((state, { payload }: { payload: boolean }) => {
      state.showSnapsModal = payload
    }),
    setSnapInstalled: create.reducer((state, { payload }: { payload: boolean }) => {
      state.snapInstalled = payload
    }),
    toggleWatchedAssetId: create.reducer((state, { payload }: { payload: AssetId }) => {
      const isWatched = state.watchedAssets.includes(payload)
      if (isWatched) {
        state.watchedAssets = state.watchedAssets.filter(assetId => assetId !== payload)
      } else {
        state.watchedAssets = state.watchedAssets.concat(payload)
      }

      getMixPanel()?.track(MixPanelEvent.ToggleWatchAsset, {
        assetId: payload,
        isAdding: !isWatched,
      })
    }),
    setHomeMarketView: create.reducer((state, { payload }: { payload: HomeMarketView }) => {
      state.selectedHomeView = payload
    }),
  }),
  selectors: {
    selectFeatureFlags: state => state.featureFlags,
    selectWatchedAssetIds: state => state.watchedAssets,
    selectSelectedLocale: state => state.selectedLocale,
    selectSelectedCurrency: state => state.selectedCurrency,
    selectBalanceThreshold: state => state.balanceThreshold,
    selectCurrencyFormat: state => state.currencyFormat,
    selectChartTimeframe: state => state.chartTimeframe,
    selectShowWelcomeModal: state => state.showWelcomeModal,
    selectShowSnapsModal: state => state.showSnapsModal,
    selectSelectedHomeView: state => state.selectedHomeView,
    selectShowConsentBanner: state => state.showConsentBanner,
  },
})
