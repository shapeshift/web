import { ChainTypes, HistoryTimeframe, UtxoAccountType } from '@shapeshiftoss/types'
import { ReduxState } from 'state/reducer'

export const mockStore: ReduxState = {
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
  txHistory: {
    [ChainTypes.Bitcoin]: {},
    [ChainTypes.Ethereum]: {}
  },
  preferences: {
    accountTypes: {
      [ChainTypes.Bitcoin]: UtxoAccountType.SegwitNative,
      [ChainTypes.Ethereum]: undefined
    }
  }
} as const
