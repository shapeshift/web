import { CAIP2, caip2, CAIP19, caip19 } from '@shapeshiftoss/caip'
import {
  chainAdapters,
  ChainTypes,
  ContractTypes,
  HistoryData,
  HistoryTimeframe,
  NetworkTypes
} from '@shapeshiftoss/types'
import { TxType } from '@shapeshiftoss/types/dist/chain-adapters'
import dayjs from 'dayjs'
import fill from 'lodash/fill'
import head from 'lodash/head'
import isEmpty from 'lodash/isEmpty'
import reduce from 'lodash/reduce'
import reverse from 'lodash/reverse'
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useCAIP19Balances } from 'hooks/useBalances/useCAIP19Balances'
import { useDebounce } from 'hooks/useDebounce/useDebounce'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { usePriceHistory } from 'pages/Assets/hooks/usePriceHistory/usePriceHistory'
import { ReduxState } from 'state/reducer'
import { selectTxHistory, Tx } from 'state/slices/txHistorySlice/txHistorySlice'

type BucketBalance = {
  crypto: {
    [k: CAIP19]: number // map of asset to base units
  }
  fiat: number
}

type Bucket = {
  start: dayjs.Dayjs
  end: dayjs.Dayjs
  balance: BucketBalance
  txs: Tx[]
}

type PriceAtBlockTimeArgs = {
  time: number
  assetPriceHistoryData: {
    date: string // epoch ms
    price: number // in usd
  }[]
}

type PriceAtBlockTime = (args: PriceAtBlockTimeArgs) => number

export const priceAtBlockTime: PriceAtBlockTime = ({ time, assetPriceHistoryData }): number => {
  for (let i = 0; i < assetPriceHistoryData.length; i++) {
    if (time > Number(assetPriceHistoryData[i].date)) continue
    return assetPriceHistoryData[i].price
  }
  return assetPriceHistoryData[assetPriceHistoryData.length - 1].price
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

type MakeBucketsArgs = {
  timeframe: HistoryTimeframe
  assets: CAIP19[]
  balances: { [k: CAIP19]: chainAdapters.Account<ChainTypes> }
}

type MakeBuckets = (args: MakeBucketsArgs) => MakeBucketsReturn

export const makeBuckets: MakeBuckets = args => {
  const { assets, balances, timeframe } = args

  // current asset balances, we iterate over this later and adjust on each tx
  const assetBalances = assets.reduce<{
    [k: CAIP19]: number
  }>((acc, cur) => {
    const assetAccount = balances[cur]
    if (!assetAccount?.balance) {
      console.error(`makeBuckets: no balance for ${cur}`)
      return acc
    }
    const balance = Number(assetAccount.balance)
    acc[cur] = balance
    return acc
  }, {})

  const makeReducer = (duration: number, unit: dayjs.ManipulateType) => {
    const now = dayjs()
    return (acc: Array<Bucket>, _cur: unknown, idx: number) => {
      const end = now.subtract(idx, unit)
      const start = end.subtract(duration, unit).add(1, 'second')
      const txs: Tx[] = []
      const balance = {
        crypto: assetBalances,
        fiat: 0
      }
      const bucket = { start, end, txs, balance }
      acc.push(bucket)
      return acc
    }
  }

  // adjust this to give charts more or less granularity
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
  balanceChartDataLoading: boolean
}

type UseBalanceChartDataArgs = {
  assets: CAIP19[]
  timeframe: HistoryTimeframe
}

type UseBalanceChartData = (args: UseBalanceChartDataArgs) => UseBalanceChartDataReturn

const caip2FromTx = ({ chain, network }: Tx): CAIP2 => caip2.toCAIP2({ chain, network })
// ideally txs from unchained should include caip19
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

type FiatBalanceAtBucketArgs = {
  bucket: Bucket
  priceHistoryData: {
    [k: CAIP19]: HistoryData[]
  }
}

type FiatBalanceAtBucketReturn = number

type FiatBalanceAtBucket = (args: FiatBalanceAtBucketArgs) => FiatBalanceAtBucketReturn

const fiatBalanceAtBucket: FiatBalanceAtBucket = ({ bucket, priceHistoryData }) => {
  const { balance, end } = bucket
  // TODO(0xdef1cafe):
  // a) interpolate for more accuracy, or
  // b) include tx timestamp in the buckets and fetch a price at that specific time
  const time = end.valueOf()
  const { crypto } = balance
  const result = Object.entries(crypto).reduce((acc, [caip19, assetCryptoBalance]) => {
    const assetPriceHistoryData = priceHistoryData[caip19]
    const price = priceAtBlockTime({ assetPriceHistoryData, time })

    const precision = 18 // TODO(0xdef1cafe): get this from a usePortfolioAssets hook
    const assetFiatBalance = bn(assetCryptoBalance)
      .div(bn(10).exponentiatedBy(precision))
      .times(price)
      .toNumber()
    return acc + assetFiatBalance
  }, 0)
  return result
}

export const useBalanceChartData: UseBalanceChartData = args => {
  const { assets, timeframe } = args
  const [balanceChartDataLoading, setBalanceChartDataLoading] = useState(true)
  const [balanceChartData, setBalanceChartData] = useState<HistoryData[]>([])
  const { balances, loading: caip19BalancesLoading } = useCAIP19Balances()
  // we can't tell if txs are finished loading over the websocket, so
  // debounce a bit before doing expensive computations
  const txs = useDebounce(
    useSelector((state: ReduxState) => selectTxHistory(state, {})),
    500
  )
  const { data: priceHistoryData, loading: priceHistoryLoading } = usePriceHistory(args)

  useEffect(() => {
    if (priceHistoryLoading) return
    if (caip19BalancesLoading) return
    if (!assets.length) return
    if (!txs.length) return
    if (isEmpty(balances)) return
    if (!assets.every(asset => (priceHistoryData[asset] ?? []).length)) return // need price history for all assets

    // put each tx into a bucket for the chart
    const bucketedTxs = bucketTxs(txs, makeBuckets({ assets, balances, timeframe }))
    // we iterate from latest to oldest
    for (let i = bucketedTxs.length - 1; i >= 0; i--) {
      const bucket = bucketedTxs[i]
      const { txs } = bucket

      // copy the balance back from the most recent bucket
      bucket.balance = Object.assign(
        {},
        bucketedTxs[i + 1]?.balance || bucketedTxs[bucketedTxs.length - 1].balance
      )

      // if we have txs in this bucket, adjust the crypto balance in each bucket
      txs.forEach(tx => {
        const assetCAIP19 = caip19FromTx(tx)
        // don't calculate price for this asset because we didn't ask for it
        if (!assets.includes(assetCAIP19)) return

        const { type, value: valueString } = tx
        const feeValue = bnOrZero(tx.fee?.value)
        const value = bnOrZero(valueString) // tx value in base units
        switch (type) {
          case TxType.Send: {
            const amount = value.plus(feeValue)
            const cryptoDiff = bn(amount).toNumber()
            bucket.balance.crypto[assetCAIP19] += cryptoDiff // we're going backwards, so a send means we had more before
            break
          }
          case TxType.Receive: {
            const cryptoDiff = bn(value).toNumber()
            bucket.balance.crypto[assetCAIP19] -= cryptoDiff // we're going backwards, so a receive means we had less before
            break
          }
          default: {
            throw new Error(`useBalanceChartData: invalid tx.type ${type}`)
          }
        }
      })

      bucket.balance.fiat = fiatBalanceAtBucket({ bucket, priceHistoryData })
      bucketedTxs[i] = bucket
    }

    const balanceChartData: Array<HistoryData> = bucketedTxs.map(bucket => ({
      price: bn(bucket.balance.fiat).decimalPlaces(2).toNumber(), // TODO(0xdef1cafe): update charts to accept price or balance
      date: bucket.end.toISOString()
    }))
    setBalanceChartData(balanceChartData)
    setBalanceChartDataLoading(false)
  }, [
    assets,
    priceHistoryData,
    priceHistoryLoading,
    txs,
    timeframe,
    balances,
    caip19BalancesLoading,
    setBalanceChartData
  ])

  const result = { balanceChartData, balanceChartDataLoading }
  return result
}
