import { HistoryData } from '@shapeshiftoss/types'

import { BalanceChartData } from './useBalanceChartData'

export const makeBalanceChartData = (total: HistoryData[] = []): BalanceChartData => ({
  total,
  rainbow: [],
})
