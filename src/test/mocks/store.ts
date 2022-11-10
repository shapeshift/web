import type { ReduxState } from 'state/reducer'
import { CurrencyFormats } from 'state/slices/preferencesSlice/preferencesSlice'

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
  validatorDataApi: mockApiFactory('validatorDataApi' as const),
  swapperApi: mockApiFactory('swapperApi' as const),
  foxEthApi: mockApiFactory('foxEthApi' as const),
  foxyApi: mockApiFactory('foxyApi' as const),
  fiatRampApi: mockApiFactory('fiatRampApi' as const),
  opportunitiesApi: mockApiFactory('opportunitiesApi' as const),
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
  },
  preferences: {
    featureFlags: {
      Osmosis: false,
      Thorchain: false,
      ThorSwap: false,
      CowSwap: false,
      Pendo: false,
      IdleFinance: false,
      Axelar: false,
      Zendesk: false,
      Yat: false,
      MultiAccounts: false,
      WalletConnectToDapps: false,
      MigrationMessage: false,
      DashboardBreakdown: false,
    },
    selectedLocale: 'en',
    balanceThreshold: '0',
    selectedCurrency: 'USD',
    currencyFormat: CurrencyFormats.DotDecimal,
    showWelcomeModal: false,
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
      byAssetId: {},
      byAccountId: {},
      ids: [],
      status: 'loading',
    },
    rebases: {
      byAssetId: {},
      byAccountId: {},
      ids: [],
      byId: {},
    },
  },
  validatorData: {
    byValidator: {},
    validatorIds: [],
  },
  foxEth: {},
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
}
