import { createSlice } from '@reduxjs/toolkit'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type { HistoryTimeframe } from '@shapeshiftoss/types'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'

import type { WalletId } from '../portfolioSlice/portfolioSliceCommon'

import { OrderDirection } from '@/components/OrderDropdown/types'
import { SortOptionsKeys } from '@/components/SortDropdown/types'
import { getConfig } from '@/config'
import { DEFAULT_HISTORY_TIMEFRAME } from '@/constants/Config'
import { simpleLocale } from '@/lib/browserLocale'
import type { SupportedFiatCurrencies } from '@/lib/market-service'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import { MarketsCategories } from '@/pages/Markets/constants'

dayjs.extend(localizedFormat)

export type FeatureFlags = {
  Optimism: boolean
  BnbSmartChain: boolean
  Polygon: boolean
  Gnosis: boolean
  Arbitrum: boolean
  ArbitrumNova: boolean
  Solana: boolean
  Tron: boolean
  Sui: boolean
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
  WcDirectConnection: boolean
  CustomSendNonce: boolean
  ThorchainLending: boolean
  ThorchainLendingBorrow: boolean
  ThorchainLendingRepay: boolean
  ThorchainLP: boolean
  ThorchainLpDeposit: boolean
  ThorchainLpWithdraw: boolean
  LedgerWallet: boolean
  TrezorWallet: boolean
  VultisigWallet: boolean
  GridPlusWallet: boolean
  ThorchainSwapLongtail: boolean
  ThorchainSwapL1ToLongtail: boolean
  RFOX: boolean
  RFOX_LP: boolean
  CustomTokenImport: boolean
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
  ButterSwap: boolean
  BebopSwap: boolean
  NearIntentsSwap: boolean
  LazyTxHistory: boolean
  RfoxFoxEcosystemPage: boolean
  LedgerReadOnly: boolean
  QuickBuy: boolean
  NewWalletManager: boolean
  SwapperFiatRamps: boolean
  WebServices: boolean
  AddressBook: boolean
  AppRating: boolean
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

export enum QuoteDisplayOption {
  Basic = 'basic',
  Advanced = 'Advanced',
}

export type Preferences = {
  featureFlags: FeatureFlags
  selectedLocale: string
  balanceThresholdUserCurrency: string
  selectedCurrency: SupportedFiatCurrencies
  currencyFormat: CurrencyFormats
  chartTimeframe: HistoryTimeframe
  showWelcomeModal: boolean
  showConsentBanner: boolean
  hasWalletSeenTcyClaimAlert: Record<WalletId, true | undefined>
  showSnapsModal: boolean
  snapInstalled: boolean
  watchedAssets: AssetId[]
  spamMarkedAssets: AssetId[]
  selectedHomeView: HomeMarketView
  quoteDisplayOption: QuoteDisplayOption
  quickBuyAmounts: number[]
  highlightedTokensFilters: {
    selectedCategory: MarketsCategories
    selectedOrder: OrderDirection
    selectedSort: SortOptionsKeys
    selectedChainId: ChainId | 'all'
  }
  hasSeenRatingModal: boolean
  showTopAssetsCarousel: boolean
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
    Tron: getConfig().VITE_FEATURE_TRON,
    Sui: getConfig().VITE_FEATURE_SUI,
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
    WcDirectConnection: getConfig().VITE_FEATURE_WC_DIRECT_CONNECTION,
    CustomSendNonce: getConfig().VITE_EXPERIMENTAL_CUSTOM_SEND_NONCE,
    ThorchainLending: getConfig().VITE_FEATURE_THORCHAIN_LENDING,
    ThorchainLendingBorrow: getConfig().VITE_FEATURE_THORCHAIN_LENDING_BORROW,
    ThorchainLendingRepay: getConfig().VITE_FEATURE_THORCHAIN_LENDING_REPAY,
    ThorchainLP: getConfig().VITE_FEATURE_THORCHAIN_LP,
    ThorchainLpDeposit: getConfig().VITE_FEATURE_THORCHAIN_LP_DEPOSIT,
    ThorchainLpWithdraw: getConfig().VITE_FEATURE_THORCHAIN_LP_WITHDRAW,
    LedgerWallet: getConfig().VITE_FEATURE_LEDGER_WALLET,
    TrezorWallet: getConfig().VITE_FEATURE_TREZOR_WALLET,
    VultisigWallet: getConfig().VITE_FEATURE_VULTISIG_WALLET,
    GridPlusWallet: getConfig().VITE_FEATURE_GRIDPLUS_WALLET,
    ThorchainSwapLongtail: getConfig().VITE_FEATURE_THORCHAINSWAP_LONGTAIL,
    ThorchainSwapL1ToLongtail: getConfig().VITE_FEATURE_THORCHAINSWAP_L1_TO_LONGTAIL,
    RFOX: getConfig().VITE_FEATURE_RFOX,
    RFOX_LP: getConfig().VITE_FEATURE_RFOX_LP,
    CustomTokenImport: getConfig().VITE_FEATURE_CUSTOM_TOKEN_IMPORT,
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
    ButterSwap: getConfig().VITE_FEATURE_BUTTERSWAP,
    BebopSwap: getConfig().VITE_FEATURE_BEBOP_SWAP,
    NearIntentsSwap: getConfig().VITE_FEATURE_NEAR_INTENTS_SWAP,
    LazyTxHistory: getConfig().VITE_FEATURE_TX_HISTORY_BYE_BYE,
    RfoxFoxEcosystemPage: getConfig().VITE_FEATURE_RFOX_FOX_ECOSYSTEM_PAGE,
    LedgerReadOnly: getConfig().VITE_FEATURE_LEDGER_READ_ONLY,
    QuickBuy: getConfig().VITE_FEATURE_QUICK_BUY,
    NewWalletManager: getConfig().VITE_FEATURE_NEW_WALLET_MANAGER,
    SwapperFiatRamps: getConfig().VITE_FEATURE_SWAPPER_FIAT_RAMPS,
    WebServices: getConfig().VITE_FEATURE_NOTIFICATIONS_WEBSERVICES,
    AddressBook: getConfig().VITE_FEATURE_ADDRESS_BOOK,
    AppRating: getConfig().VITE_FEATURE_APP_RATING,
  },
  selectedLocale: simpleLocale(),
  hasWalletSeenTcyClaimAlert: {},
  balanceThresholdUserCurrency: '0',
  selectedCurrency: 'USD',
  currencyFormat: CurrencyFormats.DotDecimalCommaThousands,
  chartTimeframe: DEFAULT_HISTORY_TIMEFRAME,
  showWelcomeModal: false,
  showConsentBanner: true,
  showSnapsModal: true,
  snapInstalled: false,
  watchedAssets: [],
  spamMarkedAssets: [],
  selectedHomeView: HomeMarketView.TopAssets,
  quoteDisplayOption: QuoteDisplayOption.Basic,
  quickBuyAmounts: [10, 50, 100],
  highlightedTokensFilters: {
    selectedCategory: MarketsCategories.Trending,
    selectedOrder: OrderDirection.Descending,
    selectedSort: SortOptionsKeys.Volume,
    selectedChainId: 'all',
  },
  hasSeenRatingModal: false,
  showTopAssetsCarousel: true,
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
        state.balanceThresholdUserCurrency = payload.threshold
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
    toggleSpamMarkedAssetId: create.reducer((state, { payload }: { payload: AssetId }) => {
      const isSpamMarked = state.spamMarkedAssets.includes(payload)
      if (isSpamMarked) {
        state.spamMarkedAssets = state.spamMarkedAssets.filter(assetId => assetId !== payload)
      } else {
        state.spamMarkedAssets = state.spamMarkedAssets.concat(payload)
      }

      getMixPanel()?.track(MixPanelEvent.ToggleIsSpamAsset, {
        assetId: payload,
        isAdding: !isSpamMarked,
      })
    }),
    setHomeMarketView: create.reducer((state, { payload }: { payload: HomeMarketView }) => {
      state.selectedHomeView = payload
    }),
    setQuoteDisplayOption: create.reducer((state, { payload }: { payload: QuoteDisplayOption }) => {
      state.quoteDisplayOption = payload
    }),
    setHasSeenTcyClaimForWallet: create.reducer((state, { payload }: { payload: WalletId }) => {
      state.hasWalletSeenTcyClaimAlert[payload] = true
    }),
    setHighlightedTokensSelectedCategory: create.reducer(
      (state, { payload }: { payload: MarketsCategories }) => {
        state.highlightedTokensFilters.selectedCategory = payload
      },
    ),
    setHighlightedTokensSelectedOrder: create.reducer(
      (state, { payload }: { payload: OrderDirection }) => {
        state.highlightedTokensFilters.selectedOrder = payload
      },
    ),
    setHighlightedTokensSelectedSort: create.reducer(
      (state, { payload }: { payload: SortOptionsKeys }) => {
        state.highlightedTokensFilters.selectedSort = payload
      },
    ),
    setHighlightedTokensSelectedChainId: create.reducer(
      (state, { payload }: { payload: ChainId | 'all' }) => {
        state.highlightedTokensFilters.selectedChainId = payload
      },
    ),
    setHasSeenRatingModal: create.reducer((state, _) => {
      state.hasSeenRatingModal = true
    }),
    setShowTopAssetsCarousel: create.reducer((state, { payload }: { payload: boolean }) => {
      state.showTopAssetsCarousel = payload
    }),
    setQuickBuyPreferences: create.reducer((state, { payload }: { payload: number[] }) => {
      state.quickBuyAmounts = payload
    }),
  }),
  selectors: {
    selectFeatureFlags: state => state.featureFlags,
    selectWatchedAssetIds: state => state.watchedAssets,
    selectSpamMarkedAssetIds: state => state.spamMarkedAssets,
    selectSelectedLocale: state => state.selectedLocale,
    selectSelectedCurrency: state => state.selectedCurrency,
    selectBalanceThresholdUserCurrency: state => state.balanceThresholdUserCurrency,
    selectCurrencyFormat: state => state.currencyFormat,
    selectChartTimeframe: state => state.chartTimeframe,
    selectShowWelcomeModal: state => state.showWelcomeModal,
    selectShowSnapsModal: state => state.showSnapsModal,
    selectSelectedHomeView: state => state.selectedHomeView,
    selectShowConsentBanner: state => state.showConsentBanner,
    selectQuoteDisplayOption: state => state.quoteDisplayOption,
    selectHasWalletSeenTcyClaimAlert: state => state.hasWalletSeenTcyClaimAlert,
    selectHighlightedTokensFilters: state => state.highlightedTokensFilters,
    selectHasSeenRatingModal: state => state.hasSeenRatingModal,
    selectShowTopAssetsCarousel: state => state.showTopAssetsCarousel,
    selectQuickBuyAmounts: state => state.quickBuyAmounts,
  },
})
