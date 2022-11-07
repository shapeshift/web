import type { ReduxState } from 'state/reducer'
import { INITIAL_PRICE_HISTORY } from 'state/slices/marketDataSlice/marketDataSlice'
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
  foxyApi: mockApiFactory('foxyApi' as const),
  fiatRampApi: mockApiFactory('fiatRampApi' as const),
  portfolio: {
    accounts: {
      byId: {},
      ids: [],
    },
    assetBalances: {
      byId: {},
      ids: [],
    },
    accountBalances: {
      byId: {},
      ids: [],
    },
    accountSpecifiers: {
      accountMetadataById: {},
      byId: {},
      ids: [],
    },
  },
  accountSpecifiers: {
    accountSpecifiers: [],
  },
  preferences: {
    featureFlags: {
      Osmosis: false,
      FoxLP: false,
      FoxFarming: false,
      Avalanche: false,
      Thorchain: false,
      ThorSwap: false,
      CowSwap: false,
      Pendo: false,
      IdleFinance: false,
      Axelar: false,
      Zendesk: false,
      Yat: false,
      MultiAccounts: false,
      SwapperV2: false,
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
      priceHistory: INITIAL_PRICE_HISTORY,
    },
    fiat: {
      byId: {},
      ids: [],
      priceHistory: INITIAL_PRICE_HISTORY,
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
}
