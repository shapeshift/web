import { HistoryTimeframe } from '@shapeshiftoss/types'
import { ReduxState } from 'state/reducer'

export const mockStore: ReduxState = {
  portfolioApi: {
    queries: {},
    mutations: {},
    provided: {},
    subscriptions: {},
    config: {
      reducerPath: 'portfolioApi',
      keepUnusedDataFor: 0,
      online: false,
      focused: false,
      middlewareRegistered: false,
      refetchOnFocus: false,
      refetchOnMountOrArgChange: false,
      refetchOnReconnect: false
    }
  },
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
