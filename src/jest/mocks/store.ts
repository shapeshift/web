import { HistoryTimeframe } from '@shapeshiftoss/types'
import { TxHistory } from 'state/slices/txHistorySlice/txHistorySlice'

export const mockStore = {
  assets: {},
  marketData: {
    marketData: {},
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
  txHistory: {} as TxHistory,
  preferences: {
    accountTypes: {}
  }
} as const
