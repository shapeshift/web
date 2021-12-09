import { CAIP19 } from '@shapeshiftoss/caip'
import { chainAdapters, ChainTypes, HistoryData, HistoryTimeframe } from '@shapeshiftoss/types'
import { TxType } from '@shapeshiftoss/types/dist/chain-adapters'
import { BigNumber } from 'bignumber.js'
import dayjs from 'dayjs'
import fill from 'lodash/fill'
import head from 'lodash/head'
import isEmpty from 'lodash/isEmpty'
import isNil from 'lodash/isNil'
import last from 'lodash/last'
import reduce from 'lodash/reduce'
import reverse from 'lodash/reverse'
import sortedIndexBy from 'lodash/sortedIndexBy'
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useCAIP19Balances } from 'hooks/useBalances/useCAIP19Balances'
import { useDebounce } from 'hooks/useDebounce/useDebounce'
import { PortfolioAssets, usePortfolioAssets } from 'hooks/usePortfolioAssets/usePortfolioAssets'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { usePriceHistory } from 'pages/Assets/hooks/usePriceHistory/usePriceHistory'
import { PriceHistoryData } from 'pages/Assets/hooks/usePriceHistory/usePriceHistory'
import { ReduxState } from 'state/reducer'
import { selectTxs, Tx } from 'state/slices/txHistorySlice/txHistorySlice'

type PriceAtBlockTimeArgs = {
  time: number
  assetPriceHistoryData: {
    date: string // epoch ms
    price: number // in usd
  }[]
}

type PriceAtBlockTime = (args: PriceAtBlockTimeArgs) => number

export const priceAtBlockTime: PriceAtBlockTime = ({ time, assetPriceHistoryData }): number => {
  const { length } = assetPriceHistoryData
  // https://lodash.com/docs/4.17.15#sortedIndexBy - binary search rather than O(n)
  const i = sortedIndexBy(assetPriceHistoryData, { date: String(time), price: 0 }, ({ date }) =>
    Number(date)
  )
  if (i === 0) return assetPriceHistoryData[i].price
  if (i >= length) return assetPriceHistoryData[length - 1].price
  return assetPriceHistoryData[i].price
}

type CryptoBalance = {
  [k: CAIP19]: BigNumber // map of asset to base units
}

type BucketBalance = {
  crypto: CryptoBalance
  fiat: BigNumber
}

export type Bucket = {
  start: dayjs.Dayjs
  end: dayjs.Dayjs
  balance: BucketBalance
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

type MakeBucketsArgs = {
  timeframe: HistoryTimeframe
  assets: CAIP19[]
  balances: { [k: CAIP19]: chainAdapters.Account<ChainTypes> }
}

// adjust this to give charts more or less granularity
export const timeframeMap = {
  [HistoryTimeframe.HOUR]: { count: 60, duration: 1, unit: 'minute' },
  [HistoryTimeframe.DAY]: { count: 289, duration: 5, unit: 'minutes' },
  [HistoryTimeframe.WEEK]: { count: 168, duration: 1, unit: 'hours' },
  [HistoryTimeframe.MONTH]: { count: 362, duration: 2, unit: 'hours' },
  [HistoryTimeframe.YEAR]: { count: 365, duration: 1, unit: 'days' },
  [HistoryTimeframe.ALL]: { count: 262, duration: 1, unit: 'weeks' }
}

type MakeBuckets = (args: MakeBucketsArgs) => MakeBucketsReturn

export const makeBuckets: MakeBuckets = args => {
  const { assets, balances, timeframe } = args

  // current asset balances, we iterate over this later and adjust on each tx
  const assetBalances = assets.reduce<CryptoBalance>((acc, cur) => {
    const account = balances[cur]
    if (!account) return acc // we don't have a balance for this asset, e.g. metamask bitcoin
    acc[cur] = bnOrZero(account.balance)
    return acc
  }, {})

  const makeReducer = (duration: number, unit: dayjs.ManipulateType) => {
    const now = dayjs()
    return (acc: Array<Bucket>, _cur: unknown, idx: number) => {
      const end = now.subtract(idx * duration, unit)
      const start = end.subtract(duration, unit).add(1, 'second')
      const txs: Tx[] = []
      const balance = {
        crypto: assetBalances,
        fiat: bn(0)
      }
      const bucket = { start, end, txs, balance }
      acc.push(bucket)
      return acc
    }
  }

  const meta = timeframeMap[timeframe]
  const { count, duration, unit } = meta
  const buckets = reverse(reduce(fill(Array(count), 0), makeReducer(duration, unit), []))
  return { buckets, meta }
}

export const bucketTxs = (txs: Tx[], bucketsAndMeta: MakeBucketsReturn): Bucket[] => {
  const { buckets, meta } = bucketsAndMeta
  const start = head(buckets)!.start
  const end = last(buckets)!.end
  // txs are potentially a lot longer than buckets, iterate the long list once
  const result = txs.reduce((acc, tx) => {
    const txDayjs = dayjs(tx.blockTime * 1000) // unchained uses seconds
    // if the tx is outside the time domain ignore it
    if (txDayjs.isBefore(start) || txDayjs.isAfter(end)) return acc
    const { duration, unit } = meta
    // the number of time units from start of chart to this tx
    let bucketIndex = Math.floor(txDayjs.diff(start, unit as dayjs.OpUnitType) / duration)
    if (bucketIndex < 0 || bucketIndex > buckets.length - 1) {
      console.error(
        `bucketTxs: tx outside buckets: ${
          tx.txid
        }, start: ${start.valueOf()}, end: ${end.valueOf()}, meta: ${meta}`
      )
      return acc
    }
    // add to the correct bucket
    acc[bucketIndex].txs.push(tx)
    return acc
  }, buckets)
  return result
}

type FiatBalanceAtBucketArgs = {
  bucket: Bucket
  portfolioAssets: PortfolioAssets
  priceHistoryData: {
    [k: CAIP19]: HistoryData[]
  }
}

type FiatBalanceAtBucket = (args: FiatBalanceAtBucketArgs) => BigNumber

const fiatBalanceAtBucket: FiatBalanceAtBucket = ({
  bucket,
  priceHistoryData,
  portfolioAssets
}) => {
  const { balance, end } = bucket
  // TODO(0xdef1cafe): this isn't super accurate, we can
  // a) interpolate for more accuracy (still not much better), or
  // b) fetch a price at each specific tx time
  const time = end.valueOf()
  const { crypto } = balance
  const result = Object.entries(crypto).reduce((acc, [caip19, assetCryptoBalance]) => {
    const assetPriceHistoryData = priceHistoryData[caip19]
    const price = priceAtBlockTime({ assetPriceHistoryData, time })
    const portfolioAsset = portfolioAssets[caip19]
    if (!portfolioAsset) {
      console.warn(`fiatBalanceAtBucket: no portfolioAsset for ${caip19}`)
      console.warn('portfolioAssets', portfolioAssets)
      return acc
    }
    const { precision } = portfolioAsset
    const assetFiatBalance = assetCryptoBalance.div(bn(10).exponentiatedBy(precision)).times(price)

    return acc.plus(assetFiatBalance)
  }, bn(0))

  return result
}

type CalculateBucketPricesArgs = {
  accountTypes: Record<string, any>
  assets: CAIP19[]
  buckets: Bucket[]
  portfolioAssets: PortfolioAssets
  priceHistoryData: PriceHistoryData
}

type CalculateBucketPrices = (args: CalculateBucketPricesArgs) => Bucket[]

// note - this mutates buckets
export const calculateBucketPrices: CalculateBucketPrices = (args): Bucket[] => {
  const { accountTypes, assets, buckets, portfolioAssets, priceHistoryData } = args

  // we iterate from latest to oldest
  for (let i = buckets.length - 1; i >= 0; i--) {
    const bucket = buckets[i]
    const { txs } = bucket

    // copy the balance back from the most recent bucket
    const currentBalance = buckets[i + 1]?.balance ?? buckets[buckets.length - 1].balance
    bucket.balance = Object.assign({}, currentBalance)

    // if we have txs in this bucket, adjust the crypto balance in each bucket
    txs.forEach(tx => {
      // TODO(0xdef1cafe): type preferencesSlice correctly and remove this chain specific hack
      // only consider the selected account type of the portfolio
      if (tx.accountType && tx.accountType !== accountTypes[tx.chain]) return

      if (tx.fee && assets.includes(tx.fee.caip19)) {
        // balance history being built in descending order, so fee means we had more before
        bucket.balance.crypto[tx.fee.caip19] = bucket.balance.crypto[tx.fee.caip19].plus(
          bnOrZero(tx.fee.value)
        )
      }

      tx.transfers.forEach(transfer => {
        const asset = transfer.caip19

        if (!assets.includes(asset)) return

        const bucketValue = bnOrZero(bucket.balance.crypto[asset])
        const transferValue = bnOrZero(transfer.value)

        switch (transfer.type) {
          case TxType.Send:
            // we're going backwards, so a send means we had more before
            bucket.balance.crypto[asset] = bucketValue.plus(transferValue)
            break
          case TxType.Receive:
            // we're going backwards, so a receive means we had less before
            bucket.balance.crypto[asset] = bucketValue.minus(transferValue)
            break
          default: {
            console.warn(`calculateBucketPrices: unknown tx type ${transfer.type}`)
          }
        }
      })
    })

    bucket.balance.fiat = fiatBalanceAtBucket({ bucket, priceHistoryData, portfolioAssets })
    buckets[i] = bucket
  }
  return buckets
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

/*
  this whole implementation is kind of jank, but it's the data we have to work with
  we take the current asset balances, and work backwards, updating crypto
  balances and fiat prices for each time interval (bucket) of the chart

  this can leave residual value at the beginning of charts, or inaccuracies
  especially if txs occur during periods of volatility
*/
export const useBalanceChartData: UseBalanceChartData = args => {
  // assets is a caip19[] of requested assets for this balance chart
  const { assets, timeframe } = args
  const [balanceChartDataLoading, setBalanceChartDataLoading] = useState(true)
  const [balanceChartData, setBalanceChartData] = useState<HistoryData[]>([])
  const { balances, loading: caip19BalancesLoading } = useCAIP19Balances()
  const accountTypes = useSelector((state: ReduxState) => state.preferences.accountTypes)
  const {
    state: { walletInfo }
  } = useWallet()
  // portfolioAssets are all assets in a users portfolio
  const { portfolioAssets, portfolioAssetsLoading } = usePortfolioAssets()
  // we can't tell if txs are finished loading over the websocket, so
  // debounce a bit before doing expensive computations
  const txs = useDebounce(useSelector(selectTxs), 500)
  const { data: priceHistoryData, loading: priceHistoryLoading } = usePriceHistory(args)

  useEffect(() => {
    if (isNil(walletInfo?.deviceId)) return
    if (priceHistoryLoading) return
    if (caip19BalancesLoading) return
    if (portfolioAssetsLoading) return
    if (!assets.length) return
    if (!txs.length) return
    if (isEmpty(balances)) return
    if (!assets.every(asset => (priceHistoryData[asset] ?? []).length)) return // need price history for all assets

    setBalanceChartDataLoading(true)
    // create empty buckets based on the assets, current balances, and timeframe
    const emptyBuckets = makeBuckets({ assets, balances, timeframe })
    // put each tx into a bucket for the chart
    const buckets = bucketTxs(txs, emptyBuckets)

    // iterate each bucket, updating crypto balances and fiat prices per bucket
    const calculatedBuckets = calculateBucketPrices({
      accountTypes,
      assets,
      buckets,
      priceHistoryData,
      portfolioAssets
    })

    const balanceChartData: Array<HistoryData> = calculatedBuckets.map(bucket => ({
      price: bn(bucket.balance.fiat).decimalPlaces(2).toNumber(),
      date: bucket.end.toISOString()
    }))
    setBalanceChartData(balanceChartData)
    setBalanceChartDataLoading(false)
  }, [
    assets,
    accountTypes,
    priceHistoryData,
    priceHistoryLoading,
    txs,
    timeframe,
    balances,
    caip19BalancesLoading,
    setBalanceChartData,
    portfolioAssetsLoading,
    portfolioAssets,
    walletInfo?.deviceId
  ])

  const result = { balanceChartData, balanceChartDataLoading }
  return result
}
