import { HistoryData, HistoryTimeframe } from '@shapeshiftoss/types'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import { usePortfolio } from 'pages/Dashboard/contexts/PortfolioContext'

type UseBalanceChartDataReturn = {
  balanceChartData: Array<HistoryData>
  balanceChartLoading: boolean
}

type UseBalanceChartDataArgs = {
  timeframe: HistoryTimeframe
}

export const useBalanceChartData = (args: UseBalanceChartDataArgs): UseBalanceChartDataReturn => {
  // const { timeframe } = args
  const [balanceChartLoading, setBalanceChartLoading] = useState(true)
  const { /* balances, */ loading: portfolioLoading } = usePortfolio()

  useEffect(() => {
    if (portfolioLoading) return
    setBalanceChartLoading(false)
  }, [setBalanceChartLoading, portfolioLoading])

  const balanceChartData: Array<HistoryData> = [
    { date: dayjs().subtract(3, 'weeks').toISOString(), price: 10 },
    { date: dayjs().subtract(2, 'weeks').toISOString(), price: 32 },
    { date: dayjs().subtract(1, 'weeks').toISOString(), price: 50 },
    { date: dayjs().subtract(1, 'day').toISOString(), price: 5 }
  ]

  const result = { balanceChartData, balanceChartLoading }
  return result
}
