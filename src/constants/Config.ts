import { HistoryTimeframe } from '@shapeshiftoss/types'

export const constants = {
  // used by AssetChart, Portfolio, and this config.ts to prefetch price history
  DEFAULT_HISTORY_TIMEFRAME: HistoryTimeframe.MONTH,
} as const
