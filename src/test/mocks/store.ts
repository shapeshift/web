import { HistoryTimeframe } from '@shapeshiftoss/types'

import { ReduxState } from '../../state/reducer'

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
    refetchOnReconnect: false
  }
})

export const mockStore: ReduxState = {
  assetApi: mockApiFactory('assetApi' as const),
  portfolioApi: mockApiFactory('portfolioApi' as const),
  marketApi: mockApiFactory('marketApi' as const),
  txHistoryApi: mockApiFactory('txHistoryApi' as const),
  stakingDataApi: mockApiFactory('stakingDataApi' as const),
  portfolio: {
    accounts: {
      byId: {},
      ids: []
    },
    assetBalances: {
      byId: {},
      ids: []
    },
    accountBalances: {
      byId: {},
      ids: []
    },
    accountSpecifiers: {
      byId: {},
      ids: []
    }
  },
  accountSpecifiers: {
    accountSpecifiers: []
  },
  preferences: {
    featureFlags: {
      CosmosInvestor: false,
      CosmosPlugin: false,
      GemRamp: false,
      FoxyInvestor: false,
      ReduxLogging: false
    },
    selectedLocale: 'en',
    balanceThreshold: '0',
    // the following object is required by redux-persist
    _persist: {
      version: 0,
      rehydrated: false
    }
  },
  assets: {
    byId: {},
    ids: []
  },
  marketData: {
    byId: {},
    ids: [],
    priceHistory: {
      [HistoryTimeframe.DAY]: {},
      [HistoryTimeframe.HOUR]: {},
      [HistoryTimeframe.WEEK]: {},
      [HistoryTimeframe.MONTH]: {},
      [HistoryTimeframe.YEAR]: {},
      [HistoryTimeframe.ALL]: {}
    },
    loading: false
  },
  txHistory: {
    txs: {
      byId: {},
      byAssetId: {},
      byAccountId: {},
      ids: [],
      status: 'idle'
    },
    rebases: {
      byAssetId: {},
      byAccountId: {},
      ids: [],
      byId: {}
    }
  },
  stakingData: {
    byAccountSpecifier: {},
    status: 'idle',
    validatorStatus: 'idle',
    byValidator: {}
  }
}
