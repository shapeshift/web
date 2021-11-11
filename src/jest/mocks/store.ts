import { TxHistory } from 'state/slices/txHistorySlice/txHistorySlice'

export const mockStore = {
  assets: {},
  marketData: {
    marketData: {},
    loading: false
  },
  txHistory: {} as TxHistory,
  preferences: {
    accountTypes: {}
  }
} as const
