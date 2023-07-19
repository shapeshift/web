import { DEFAULT_HISTORY_TIMEFRAME } from 'constants/Config'
import type { ReduxState } from 'state/reducer'
import { defaultAsset } from 'state/slices/assetsSlice/assetsSlice'
import { CurrencyFormats } from 'state/slices/preferencesSlice/preferencesSlice'
import { MultiHopExecutionStatus } from 'state/slices/swappersSlice/types'

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

export const mockStore: ReduxState = {
  assetApi: mockApiFactory('assetApi' as const),
  portfolioApi: mockApiFactory('portfolioApi' as const),
  marketApi: mockApiFactory('marketApi' as const),
  txHistoryApi: mockApiFactory('txHistoryApi' as const),
  zapperApi: mockApiFactory('zapperApi' as const),
  nftApi: mockApiFactory('nftApi' as const),
  covalentApi: mockApiFactory('covalentApi' as const),
  zapper: mockApiFactory('zapper' as const),
  swapperApi: mockApiFactory('swapperApi' as const),
  swappersApi: mockApiFactory('swappersApi' as const),
  foxyApi: mockApiFactory('foxyApi' as const),
  fiatRampApi: mockApiFactory('fiatRampApi' as const),
  opportunitiesApi: mockApiFactory('opportunitiesApi' as const),
  abiApi: mockApiFactory('abiApi' as const),
  zerionApi: mockApiFactory('zerionApi' as const),
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
      BnbSmartChain: false,
      ZrxSwap: false,
      OsmosisSend: false,
      OsmosisStaking: false,
      OsmosisLP: false,
      OsmosisLPAdditionalPools: false,
      OsmosisSwap: false,
      ThorSwap: false,
      Cowswap: false,
      CowswapGnosis: false,
      IdleFinance: false,
      Axelar: false,
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
      MultiHopTrades: false,
      CoinbaseWallet: false,
      AdvancedSlippage: false,
      WalletConnectV2: false,
    },
    selectedLocale: 'en',
    balanceThreshold: '0',
    selectedCurrency: 'USD',
    currencyFormat: CurrencyFormats.DotDecimalCommaThousands,
    chartTimeframe: DEFAULT_HISTORY_TIMEFRAME,
    showWelcomeModal: false,
    showConsentBanner: true,
    // the following object is required by redux-persist
    _persist: {
      version: 0,
      rehydrated: false,
    },
  },
  assets: {
    byId: {},
    ids: [],
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
  },
  txHistory: {
    txs: {
      byId: {},
      byAccountIdAssetId: {},
      ids: [],
    },
    rebases: {
      byAccountIdAssetId: {},
      ids: [],
      byId: {},
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
  swappers: {
    buyAsset: defaultAsset,
    sellAsset: defaultAsset,
    sellAssetAccountId: undefined,
    buyAssetAccountId: undefined,
    sellAmountCryptoPrecision: '0',
    tradeExecutionStatus: MultiHopExecutionStatus.Unknown,
    willDonate: true,
    manualReceiveAddress: undefined,
    manualReceiveAddressIsValidating: false,
  },
  tradeQuoteSlice: {
    activeSwapperName: undefined,
    confirmedQuote: undefined,
    activeStep: undefined,
  },
}
