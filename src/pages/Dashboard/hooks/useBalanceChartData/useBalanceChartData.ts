import { CAIP19, caip19 } from '@shapeshiftoss/caip'
import {
  ChainTypes,
  ContractTypes,
  HistoryData,
  HistoryTimeframe,
  NetworkTypes
} from '@shapeshiftoss/types'
import dayjs from 'dayjs'
import { fill, head, reduce, reverse } from 'lodash'
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useDebounce } from 'hooks/useDebounce/useDebounce'
import { bn } from 'lib/bignumber/bignumber'
import { usePriceHistory } from 'pages/Assets/hooks/usePriceHistory/usePriceHistory'
import { ReduxState } from 'state/reducer'
import { selectTxHistory, Tx } from 'state/slices/txHistorySlice/txHistorySlice'

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

type PriceAtBlockTimeArgs = {
  time: number
  caip: CAIP19
  priceHistoryData: {
    [k: CAIP19]: {
      date: string // epoch ms
      price: number // in usd
    }[]
  }
}
type PriceAtBlockTime = (args: PriceAtBlockTimeArgs) => number

export const priceAtBlockTime: PriceAtBlockTime = ({ time, caip, priceHistoryData }): number => {
  const assetPrices = priceHistoryData[caip]
  let result = 0
  for (let i = 0; i < assetPrices.length; i++) {
    if (time < Number(assetPrices[i].date)) {
      continue
    } else {
      result = assetPrices[i].price
      break
    }
  }
  if (result === 0) console.info(`priceAtBlockTime result is 0 for asset ${caip}`)
  return result
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

type UseBalanceChartDataReturn = {
  balanceChartData: Array<HistoryData>
  balanceChartLoading: boolean
}

type UseBalanceChartDataArgs = {
  assets: CAIP19[]
  timeframe: HistoryTimeframe
  totalBalance: number // maybe not an arg
}

type UseBalanceChartData = (args: UseBalanceChartDataArgs) => UseBalanceChartDataReturn

// TODO(0xdef1cafe): pull this from user prefs
const initialBuckets = makeBuckets(HistoryTimeframe.YEAR)

export const useBalanceChartData: UseBalanceChartData = args => {
  const { timeframe, totalBalance } = args
  const [bucketsAndMeta, setBucketsAndMeta] = useState<MakeBucketsReturn>(initialBuckets)
  const [balanceChartLoading, setBalanceChartLoading] = useState(true)
  const [balanceChartData, setBalanceChartData] = useState<HistoryData[]>([])
  // const { balances, loading: portfolioLoading } = usePortfolio()
  const rawTxs = useSelector((state: ReduxState) => selectTxHistory(state, {}))
  // wait for tx's to finish loading
  const txs = useDebounce(rawTxs, 250)
  const { data: priceHistoryData, loading: priceHistoryLoading } = usePriceHistory(args)

  useEffect(() => {
    setBucketsAndMeta(makeBuckets(timeframe))
  }, [timeframe])

  useEffect(() => {
    if (priceHistoryLoading) return
    if (!txs.length) return
    const { buckets, meta } = bucketsAndMeta
    const start = head(buckets)!.start
    // txs are potentially a lot longer than buckets (~100), iterate the long list once
    const bucketedTxs = txs.reduce((acc, tx) => {
      // if we've seen this tx already ignore it
      const txDayjs = dayjs(tx.blockTime * 1000)
      // if the tx is before the time domain ignore it, it can't be past the end (now)
      if (txDayjs.isBefore(start)) return acc
      const { unit } = meta
      // the number of time units from start to this tx
      const bucketIndex = txDayjs.diff(start, unit as dayjs.OpUnitType)
      // add to the correct bucket
      acc[bucketIndex].txs.push(tx)
      return acc
    }, buckets)

    console.info('priceHistoryData')
    console.info(priceHistoryData)
    console.info(bucketedTxs)

    // let balanceAtBucket = totalBalance

    for (let i = bucketedTxs.length; i >= 0; i--) {
      const bucket = bucketedTxs[i]
      const { txs } = bucket
      if (!txs.length) continue

      txs.forEach(tx => {
        const { asset, blockTime } = tx
        const time = blockTime * 1000 // unchained uses seconds, price history ms
        const chain = ChainTypes.Ethereum
        const network = NetworkTypes.MAINNET
        const contractType = ContractTypes.ERC20
        const common = { chain, network }
        const tokenId = asset
        const extra = asset === 'ethereum' ? undefined : { contractType, tokenId }
        const caip = caip19.toCAIP19({ ...common, ...extra })
        const price = priceAtBlockTime({ time, caip, priceHistoryData })
        console.info(`price for ${caip}`, price)
      })
    }

    // return fake data
    const fakeData: Array<HistoryData> = buckets.map(bucket => ({
      price: bn(Math.random()).times(420.69).decimalPlaces(2).toNumber(),
      date: bucket.end.toISOString()
    }))
    console.info('new balance chart data')
    setBalanceChartData(fakeData)
    setBalanceChartLoading(false)
  }, [
    bucketsAndMeta,
    priceHistoryData,
    priceHistoryLoading,
    txs,
    timeframe,
    totalBalance,
    setBalanceChartData
  ])

  const result = { balanceChartData, balanceChartLoading }
  return result
}
