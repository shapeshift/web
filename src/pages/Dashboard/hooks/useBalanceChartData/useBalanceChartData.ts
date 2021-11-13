import { CAIP2, caip2, CAIP19, caip19 } from '@shapeshiftoss/caip'
import {
  ChainTypes,
  ContractTypes,
  HistoryData,
  HistoryTimeframe,
  NetworkTypes
} from '@shapeshiftoss/types'
import { TxType } from '@shapeshiftoss/types/dist/chain-adapters'
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
  balance: number
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
  caip19: CAIP19
  assetPriceHistoryData: {
    date: string // epoch ms
    price: number // in usd
  }[]
}

type PriceAtBlockTime = (args: PriceAtBlockTimeArgs) => number

export const priceAtBlockTime: PriceAtBlockTime = ({
  caip19,
  time,
  assetPriceHistoryData
}): number => {
  let result = 0
  for (let i = 0; i < assetPriceHistoryData.length; i++) {
    if (time > Number(assetPriceHistoryData[i].date)) {
      continue
    } else {
      result = assetPriceHistoryData[i].price
      break
    }
  }
  return result
}

export const makeBuckets = (timeframe: HistoryTimeframe): MakeBucketsReturn => {
  const makeReducer = (duration: number, unit: dayjs.ManipulateType) => {
    const now = dayjs()
    return (acc: Array<Bucket>, _cur: unknown, idx: number) => {
      const end = now.subtract(idx, unit)
      const start = end.subtract(duration, unit).add(1, 'second')
      const txs: Tx[] = []
      const balance = 0
      const bucket = { start, end, txs, balance }
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
    [HistoryTimeframe.ALL]: { count: 60, duration: 1, unit: 'months' }
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
  totalBalance: number
}

type UseBalanceChartData = (args: UseBalanceChartDataArgs) => UseBalanceChartDataReturn

// all of this should come from unchained
const caip2FromTx = ({ chain, network }: Tx): CAIP2 => caip2.toCAIP2({ chain, network })
const caip19FromTx = (tx: Tx): CAIP19 => {
  const { chain, network, asset: tokenId } = tx
  const ethereumCAIP2 = caip2.toCAIP2({
    chain: ChainTypes.Ethereum,
    network: NetworkTypes.MAINNET
  })
  const assetCAIP2 = caip2FromTx(tx)
  const contractType =
    assetCAIP2 === ethereumCAIP2 && tokenId.startsWith('0x') ? ContractTypes.ERC20 : undefined

  const extra = contractType ? { contractType, tokenId } : undefined
  const assetCAIP19 = caip19.toCAIP19({ chain, network, ...extra })
  return assetCAIP19
}

const bucketTxs = (txs: Tx[], bucketsAndMeta: MakeBucketsReturn): Bucket[] => {
  const { buckets, meta } = bucketsAndMeta
  const start = head(buckets)!.start
  // txs are potentially a lot longer than buckets (max 95), iterate the long list once
  const result = txs.reduce((acc, tx) => {
    const txDayjs = dayjs(tx.blockTime * 1000) // unchained uses seconds
    // if the tx is before the time domain ignore it, it can't be past the end (now)
    if (txDayjs.isBefore(start)) return acc
    const { unit } = meta
    // the number of time units from start of chart to this tx
    const bucketIndex = txDayjs.diff(start, unit as dayjs.OpUnitType)
    // add to the correct bucket
    acc[bucketIndex].txs.push(tx)
    return acc
  }, buckets)
  return result
}

export const useBalanceChartData: UseBalanceChartData = args => {
  const { assets, timeframe, totalBalance } = args
  const [balanceChartLoading, setBalanceChartLoading] = useState(true)
  const [balanceChartData, setBalanceChartData] = useState<HistoryData[]>([])
  // we can't tell if txs are finished loading over the websocket, so
  // debounce a bit before doing expensive computations
  const txs = useDebounce(
    useSelector((state: ReduxState) => selectTxHistory(state, {})),
    500
  )
  const { data: priceHistoryData, loading: priceHistoryLoading } = usePriceHistory(args)

  useEffect(() => {
    if (priceHistoryLoading) return
    if (!assets.length) return
    if (!txs.length) return
    if (!assets.every(asset => (priceHistoryData[asset] ?? []).length)) return // need price history for all assets

    // put each tx into a bucket for the chart
    const bucketedTxs = bucketTxs(txs, makeBuckets(timeframe))
    // we iterate from latest to oldest
    for (let i = bucketedTxs.length - 1; i >= 0; i--) {
      const bucket = bucketedTxs[i]
      const { txs } = bucket

      let balanceAtBucket = bucketedTxs[i + 1]?.balance || totalBalance
      // if we don't have txs for this bucket, use the later one
      if (!txs.length) {
        bucketedTxs[i].balance = balanceAtBucket
        continue
      }

      txs.forEach(tx => {
        const assetCAIP19 = caip19FromTx(tx)
        // don't calculate price for this asset because we didn't ask for it
        if (!assets.includes(assetCAIP19)) {
          bucketedTxs[i].balance = balanceAtBucket
          return
        }

        const { blockTime, type, value: valueString } = tx
        const value = Number(valueString) // tx value in base units
        const time = blockTime * 1000 // unchained uses seconds, price history uses ms

        const assetPriceHistoryData = priceHistoryData[assetCAIP19]
        const price = priceAtBlockTime({ time, caip19: assetCAIP19, assetPriceHistoryData })
        const assetPrecision = 18 // TODO(0xdef1cafe): get this from asset service
        switch (type) {
          case TxType.Send: {
            const diff = bn(value)
              .div(bn(10).exponentiatedBy(assetPrecision))
              .times(price)
              .toNumber()
            balanceAtBucket -= diff
            bucketedTxs[i].balance = balanceAtBucket
            return
          }
          case TxType.Receive: {
            const diff = bn(value)
              .div(bn(10).exponentiatedBy(assetPrecision))
              .times(price)
              .toNumber()
            balanceAtBucket += diff
            bucketedTxs[i].balance = balanceAtBucket
            return
          }
          default: {
            throw new Error(`useBalanceChartData: invalid tx.type ${type}`)
          }
        }
      })
    }

    const balanceChartData: Array<HistoryData> = bucketedTxs.map(bucket => ({
      price: bn(bucket.balance).decimalPlaces(2).toNumber(), // TODO(0xdef1cafe): update charts to accept price or balance
      date: bucket.end.toISOString()
    }))
    setBalanceChartData(balanceChartData)
    setBalanceChartLoading(false)
  }, [
    assets,
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
