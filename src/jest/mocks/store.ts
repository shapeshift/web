import { HistoryTimeframe } from '@shapeshiftoss/types'
import { ReduxState } from 'state/reducer'

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
  portfolioApi: mockApiFactory('portfolioApi' as const),
  marketApi: mockApiFactory('marketApi' as const),
  portfolio: {
    accounts: {
      byId: {},
      ids: []
    },
    balances: {
      byId: {},
      ids: []
    }
  },
  assets: {
    byId: {},
    ids: []
  },
  marketData: {
    marketData: {
      byId: {},
      ids: []
    },
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
    byId: {},
    ids: []
  },
  preferences: {
    accountTypes: {}
  }
}
