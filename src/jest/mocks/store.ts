import { HistoryTimeframe } from '@shapeshiftoss/types'
import { ReduxState } from 'state/reducer'

export const mockStore: ReduxState = {
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
