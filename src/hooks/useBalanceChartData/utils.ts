import type { HistoryData } from '@shapeshiftoss/types'

import type { BalanceChartData } from './useBalanceChartData'

export const makeBalanceChartData = (total: HistoryData[] = []): BalanceChartData => ({
  total,
  rainbow: [],
})
