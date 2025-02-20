import { createSlice } from '@reduxjs/toolkit'
import type { AssetId } from '@shapeshiftoss/caip'
import type { HistoryTimeframe } from '@shapeshiftoss/types'
import { getConfig } from 'config'
import { DEFAULT_HISTORY_TIMEFRAME } from 'constants/Config'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import { simpleLocale } from 'lib/browserLocale'
import type { SupportedFiatCurrencies } from 'lib/market-service'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from 'lib/mixpanel/types'

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
  ThorSwap: boolean
  ThorSwapStreamingSwaps: boolean
  WalletConnectToDapps: boolean
  WalletConnectToDappsV2: boolean
  SaversVaults: boolean
  SaversVaultsDeposit: boolean
  SaversVaultsWithdraw: boolean
  Cowswap: boolean
  ZrxSwap: boolean
  Mixpanel: boolean
  LifiSwap: boolean
  DynamicLpAssets: boolean
  ReadOnlyAssets: boolean
  Jaypegz: boolean
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
  ThorFreeFees: boolean
  JupiterSwap: boolean
  NewWalletFlow: boolean
  FoxPageFoxWifHatSection: boolean
  NewLimitFlow: boolean
  ThorchainSwapperVolatilityAck: boolean
  ThorchainPoolsInstabilityWarning: boolean
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
    Solana: getConfig().REACT_APP_FEATURE_SOLANA,
    Base: getConfig().REACT_APP_FEATURE_BASE,
    ThorSwap: getConfig().REACT_APP_FEATURE_THOR_SWAP,
    ThorSwapStreamingSwaps: getConfig().REACT_APP_FEATURE_THOR_SWAP_STREAMING_SWAPS,
    WalletConnectToDappsV2: getConfig().REACT_APP_FEATURE_WALLET_CONNECT_TO_DAPPS_V2,
    WalletConnectToDapps: getConfig().REACT_APP_FEATURE_WALLET_CONNECT_TO_DAPPS,
    SaversVaults: getConfig().REACT_APP_FEATURE_SAVERS_VAULTS,
    SaversVaultsDeposit: getConfig().REACT_APP_FEATURE_SAVERS_VAULTS_DEPOSIT,
    SaversVaultsWithdraw: getConfig().REACT_APP_FEATURE_SAVERS_VAULTS_WITHDRAW,
    Cowswap: getConfig().REACT_APP_FEATURE_COWSWAP,
    ZrxSwap: getConfig().REACT_APP_FEATURE_ZRX_SWAP,
    LifiSwap: getConfig().REACT_APP_FEATURE_LIFI_SWAP,
    Mixpanel: getConfig().REACT_APP_FEATURE_MIXPANEL,
    DynamicLpAssets: getConfig().REACT_APP_FEATURE_DYNAMIC_LP_ASSETS,
    ReadOnlyAssets: getConfig().REACT_APP_FEATURE_READ_ONLY_ASSETS,
    ArbitrumBridge: getConfig().REACT_APP_FEATURE_ARBITRUM_BRIDGE,
    PortalsSwap: getConfig().REACT_APP_FEATURE_PORTALS_SWAPPER,
    Chatwoot: getConfig().REACT_APP_FEATURE_CHATWOOT,
    AdvancedSlippage: getConfig().REACT_APP_FEATURE_ADVANCED_SLIPPAGE,
    WalletConnectV2: getConfig().REACT_APP_FEATURE_WALLET_CONNECT_V2,
    CustomSendNonce: getConfig().REACT_APP_EXPERIMENTAL_CUSTOM_SEND_NONCE,
    ThorchainLending: getConfig().REACT_APP_FEATURE_THORCHAIN_LENDING,
    ThorchainLendingBorrow: getConfig().REACT_APP_FEATURE_THORCHAIN_LENDING_BORROW,
    ThorchainLendingRepay: getConfig().REACT_APP_FEATURE_THORCHAIN_LENDING_REPAY,
    ThorchainLP: getConfig().REACT_APP_FEATURE_THORCHAIN_LP,
    ThorchainLpDeposit: getConfig().REACT_APP_FEATURE_THORCHAIN_LP_DEPOSIT,
    ThorchainLpWithdraw: getConfig().REACT_APP_FEATURE_THORCHAIN_LP_WITHDRAW,
    LedgerWallet: getConfig().REACT_APP_FEATURE_LEDGER_WALLET,
    ThorchainSwapLongtail: getConfig().REACT_APP_FEATURE_THORCHAINSWAP_LONGTAIL,
    ThorchainSwapL1ToLongtail: getConfig().REACT_APP_FEATURE_THORCHAINSWAP_L1_TO_LONGTAIL,
    AccountManagement: getConfig().REACT_APP_FEATURE_ACCOUNT_MANAGEMENT,
    AccountManagementLedger: getConfig().REACT_APP_FEATURE_ACCOUNT_MANAGEMENT_LEDGER,
    RFOX: getConfig().REACT_APP_FEATURE_RFOX,
    RFOX_LP: getConfig().REACT_APP_FEATURE_RFOX_LP,
    CustomTokenImport: getConfig().REACT_APP_FEATURE_CUSTOM_TOKEN_IMPORT,
    ArbitrumBridgeClaims: getConfig().REACT_APP_FEATURE_ARBITRUM_BRIDGE_CLAIMS,
    UsdtApprovalReset: getConfig().REACT_APP_FEATURE_USDT_APPROVAL_RESET,
    RunePool: getConfig().REACT_APP_FEATURE_RUNEPOOL,
    RunePoolDeposit: getConfig().REACT_APP_FEATURE_RUNEPOOL_DEPOSIT,
    RunePoolWithdraw: getConfig().REACT_APP_FEATURE_RUNEPOOL_WITHDRAW,
    Markets: getConfig().REACT_APP_FEATURE_MARKETS,
    PhantomWallet: getConfig().REACT_APP_FEATURE_PHANTOM_WALLET,
    FoxPage: getConfig().REACT_APP_FEATURE_FOX_PAGE,
    FoxPageRFOX: getConfig().REACT_APP_FEATURE_FOX_PAGE_RFOX,
    FoxPageFoxSection: getConfig().REACT_APP_FEATURE_FOX_PAGE_FOX_SECTION,
    FoxPageFoxFarmingSection: getConfig().REACT_APP_FEATURE_FOX_PAGE_FOX_FARMING_SECTION,
    FoxPageGovernance: getConfig().REACT_APP_FEATURE_FOX_PAGE_GOVERNANCE,
    LimitOrders: getConfig().REACT_APP_FEATURE_LIMIT_ORDERS,
    ChainflipSwap: getConfig().REACT_APP_FEATURE_CHAINFLIP_SWAP,
    ChainflipDca: getConfig().REACT_APP_FEATURE_CHAINFLIP_SWAP_DCA,
    SolanaSwapper: getConfig().REACT_APP_FEATURE_SWAPPER_SOLANA,
    ThorFreeFees: getConfig().REACT_APP_FEATURE_THOR_FREE_FEES,
    JupiterSwap: getConfig().REACT_APP_FEATURE_JUPITER_SWAP,
    NewWalletFlow: getConfig().REACT_APP_FEATURE_NEW_WALLET_FLOW,
    FoxPageFoxWifHatSection: getConfig().REACT_APP_FEATURE_FOX_PAGE_FOX_WIF_HAT_SECTION,
    NewLimitFlow: getConfig().REACT_APP_FEATURE_NEW_LIMIT_FLOW,
    ThorchainSwapperVolatilityAck: getConfig().REACT_APP_FEATURE_THORCHAIN_SWAPPER_ACK,
    ThorchainPoolsInstabilityWarning:
      getConfig().REACT_APP_FEATURE_THORCHAIN_POOLS_INSTABILITY_WARNINGS,
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
    toggleWatchedAssetId(state, { payload }: { payload: AssetId }) {
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
    },
    setHomeMarketView(state, { payload }: { payload: HomeMarketView }) {
      state.selectedHomeView = payload
    },
  },
})
