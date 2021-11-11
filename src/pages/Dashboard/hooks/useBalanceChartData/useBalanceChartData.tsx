import { HistoryData, HistoryTimeframe } from '@shapeshiftoss/types'
import dayjs from 'dayjs'
import { fill, head, reduce, reverse } from 'lodash'
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { bn } from 'lib/bignumber/bignumber'
import { selectRecentTxHistory } from 'pages/Dashboard/helpers/selectRecentTxHistory/selectRecentTxHistory'
import { Tx } from 'state/slices/txHistorySlice/txHistorySlice'

type UseBalanceChartDataReturn = {
  balanceChartData: Array<HistoryData>
  balanceChartLoading: boolean
}

type UseBalanceChartDataArgs = {
  timeframe: HistoryTimeframe
}

type Bucket = {
  start: dayjs.Dayjs
  end: dayjs.Dayjs
  txs: Tx[]
}

type BucketMeta = {
  count: number
  duration: number
  unit: dayjs.ManipulateType
}

type MakeBucketsReturn = {
  buckets: Array<Bucket>
  meta: BucketMeta
}

export const makeBuckets = (timeframe: HistoryTimeframe): MakeBucketsReturn => {
  const makeReducer = (duration: number, unit: dayjs.ManipulateType) => {
    const now = dayjs()
    return (acc: Array<Bucket>, _cur: unknown, idx: number) => {
      const end = now.subtract(idx, unit)
      const start = end.subtract(duration, unit).add(1, 'second')
      const txs: Tx[] = []
      const bucket = { start, end, txs }
      acc.push(bucket)
      return acc
    }
  }

  const timeframeMap = {
    [HistoryTimeframe.HOUR]: { count: 60, duration: 1, unit: 'minute' },
    [HistoryTimeframe.DAY]: { count: 95, duration: 15, unit: 'minutes' },
    [HistoryTimeframe.WEEK]: { count: 84, duration: 2, unit: 'hours' },
    [HistoryTimeframe.MONTH]: { count: 90, duration: 8, unit: 'hours' },
    [HistoryTimeframe.YEAR]: { count: 52, duration: 1, unit: 'week' },
    [HistoryTimeframe.ALL]: { count: 60, duration: 1, unit: 'weeks' }
  }

  const meta = timeframeMap[timeframe]
  const { count, duration, unit } = meta
  const buckets = reverse(reduce(fill(Array(count), 0), makeReducer(duration, unit), []))
  return { buckets, meta }
}

export const useBalanceChartData = (args: UseBalanceChartDataArgs): UseBalanceChartDataReturn => {
  const { timeframe } = args
  const [balanceChartLoading /*, setBalanceChartLoading */] = useState(true)
  const [balanceChartData, setBalanceChartData] = useState<HistoryData[]>([])
  // const { balances, loading: portfolioLoading } = usePortfolio()
  const txs = useSelector(selectRecentTxHistory)

  // useEffect(() => {
  //   if (portfolioLoading) return
  //   ;(async () => {
  //     try {
  //       const promises = await Promise.all(
  //         Object.values(balances).map(account => {
  //           const { chain } = account
  //           const tokenId = account.contract
  //           const args = { chain, timeframe, tokenId }
  //           return getPriceHistory(args)
  //         })
  //       )
  //     } catch (e) {
  //       console.error('useBalanceChartData market data error', e)
  //     } finally {
  //       setBalanceChartLoading(false)
  //     }
  //   })()
  // }, [timeframe, balances, setBalanceChartLoading, portfolioLoading])

  useEffect(() => {
    const { buckets, meta } = makeBuckets(timeframe)
    const start = head(buckets)!.start
    const seenTxs = new Map()
    // txs are potentially a lot longer than buckets (~100), iterate the long list once
    const bucketedTxs = txs.reduce((acc, tx) => {
      // if we've seen this tx already ignore it
      if (seenTxs.has(tx.blockHash)) return acc
      const txDayjs = dayjs(tx.blockTime * 1000)
      // if the tx is before the time domain ignore it, it can't be past the end (now)
      if (txDayjs.isBefore(start)) return acc
      const { unit } = meta
      // the number of time units from start to this tx
      const bucketIndex = txDayjs.diff(start, unit as dayjs.OpUnitType)
      // add to the correct bucket
      acc[bucketIndex].txs.push(tx)
      // mark as seen
      seenTxs.set(tx.blockHash, true)
      return acc
    }, buckets)

    console.info(bucketedTxs)

    // return fake data
    const fakeData: Array<HistoryData> = buckets.map(bucket => ({
      price: bn(Math.random()).times(420.69).decimalPlaces(2).toNumber(),
      date: bucket.end.toISOString()
    }))
    setBalanceChartData(fakeData)
  }, [txs, timeframe, setBalanceChartData])

  const result = { balanceChartData, balanceChartLoading }
  return result
}
