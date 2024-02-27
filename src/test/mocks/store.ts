import { DEFAULT_HISTORY_TIMEFRAME } from 'constants/Config'
import type { ReduxState } from 'state/reducer'
import { defaultAsset } from 'state/slices/assetsSlice/assetsSlice'
import { CurrencyFormats } from 'state/slices/preferencesSlice/preferencesSlice'
import { initialTradeExecutionState } from 'state/slices/tradeQuoteSlice/constants'

const mockApiFactory = <T extends unknown>(reducerPath: T) => ({
  queries: {},
  mutations: {},
  provided: {},
  subscriptions: {},
  config: {
    reducerPath,
    keepUnusedDataFor: 0,
    online: false,
    focused: false,
    middlewareRegistered: false,
    refetchOnFocus: false,
    refetchOnMountOrArgChange: false,
    refetchOnReconnect: false,
  },
})

const mockSwapperApi = Object.assign(mockApiFactory('swapperApi' as const), {
  provided: {
    TradeQuote: {},
  },
})

export const mockStore: ReduxState = {
  assetApi: mockApiFactory('assetApi' as const),
  portfolioApi: mockApiFactory('portfolioApi' as const),
  marketApi: mockApiFactory('marketApi' as const),
  txHistoryApi: mockApiFactory('txHistoryApi' as const),
  zapperApi: mockApiFactory('zapperApi' as const),
  nftApi: mockApiFactory('nftApi' as const),
  covalentApi: mockApiFactory('covalentApi' as const),
  zapper: mockApiFactory('zapper' as const),
  swapperApi: mockSwapperApi,
  foxyApi: mockApiFactory('foxyApi' as const),
  fiatRampApi: mockApiFactory('fiatRampApi' as const),
  snapshotApi: mockApiFactory('snapshotApi' as const),
  opportunitiesApi: mockApiFactory('opportunitiesApi' as const),
  abiApi: mockApiFactory('abiApi' as const),
  portfolio: {
    accounts: {
      byId: {},
      ids: [],
    },
    accountBalances: {
      byId: {},
      ids: [],
    },
    accountMetadata: {
      byId: {},
      ids: [],
    },
    wallet: {
      byId: {},
      ids: [],
    },
  },
  preferences: {
    featureFlags: {
      Jaypegz: false,
      Optimism: false,
      Polygon: false,
      Gnosis: false,
      Arbitrum: false,
      ArbitrumNova: false,
      BnbSmartChain: false,
      ZrxSwap: false,
      ThorSwap: false,
      ThorSwapStreamingSwaps: false,
      Cowswap: false,
      CowswapGnosis: false,
      Yat: false,
      WalletConnectToDapps: false,
      WalletConnectToDappsV2: false,
      Wherever: false,
      SaversVaults: false,
      Yearn: false,
      DefiDashboard: false,
      ArkeoAirdrop: false,
      TradeRates: false,
      Mixpanel: false,
      LifiSwap: false,
      FoxBondCTA: false,
      DynamicLpAssets: false,
      ReadOnlyAssets: false,
      OneInch: false,
      CovalentJaypegs: false,
      Chatwoot: false,
      CoinbaseWallet: false,
      AdvancedSlippage: false,
      WalletConnectV2: false,
      CustomSendNonce: false,
      Snaps: false,
      ThorchainLending: false,
      ThorchainLP: false,
      LedgerWallet: false,
      ThorchainSwapLongtail: false,
      ShapeShiftMobileWallet: false,
    },
    selectedLocale: 'en',
    balanceThreshold: '0',
    selectedCurrency: 'USD',
    currencyFormat: CurrencyFormats.DotDecimalCommaThousands,
    chartTimeframe: DEFAULT_HISTORY_TIMEFRAME,
    showWelcomeModal: false,
    showConsentBanner: true,
    showSnapsModal: true,
    snapInstalled: false,
    // the following object is required by redux-persist
    _persist: {
      version: 0,
      rehydrated: false,
    },
  },
  assets: {
    byId: {},
    ids: [],
    relatedAssetIndex: {},
  },
  marketData: {
    crypto: {
      byId: {},
      ids: [],
      priceHistory: {},
    },
    fiat: {
      byId: {},
      ids: [],
      priceHistory: {},
    },
    isMarketDataLoaded: false,
  },
  txHistory: {
    txs: {
      byId: {},
      byAccountIdAssetId: {},
      ids: [],
    },
  },
  opportunities: {
    lp: {
      byAccountId: {},
      byId: {},
      ids: [],
    },
    staking: {
      byAccountId: {},
      byId: {},
      ids: [],
    },
    userStaking: {
      byId: {},
      ids: [],
    },
  },
  nft: {
    selectedNftAvatarByWalletId: {},
    nfts: {
      byId: {},
      ids: [],
    },
    collections: {
      byId: {},
      ids: [],
    },
  },
  tradeInput: {
    buyAsset: defaultAsset,
    sellAsset: defaultAsset,
    sellAssetAccountId: undefined,
    buyAssetAccountId: undefined,
    sellAmountCryptoPrecision: '0',
    isInputtingFiatSellAmount: false,
    manualReceiveAddress: undefined,
    manualReceiveAddressIsValidating: false,
    manualReceiveAddressIsEditing: false,
    manualReceiveAddressIsValid: undefined,
    slippagePreferencePercentage: undefined,
  },
  tradeQuoteSlice: {
    activeQuoteMeta: undefined,
    confirmedQuote: undefined,
    activeStep: undefined,
    tradeExecution: initialTradeExecutionState,
    tradeQuotes: {},
    tradeQuoteDisplayCache: [],
    isTradeQuoteRequestAborted: false,
  },
  snapshot: {
    votingPowerByModel: {
      SWAPPER: undefined,
      THORCHAIN_LP: undefined,
    },
    strategies: undefined,
  },
  localWalletSlice: {
    walletType: null,
    walletDeviceId: null,
    nativeWalletName: null,
  },
}
