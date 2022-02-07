import { CAIP19 } from '@shapeshiftoss/caip'
import { ChainTypes, HistoryData, HistoryTimeframe } from '@shapeshiftoss/types'
import { TxType } from '@shapeshiftoss/types/dist/chain-adapters'
import { BigNumber } from 'bignumber.js'
import dayjs from 'dayjs'
import fill from 'lodash/fill'
import head from 'lodash/head'
import isNil from 'lodash/isNil'
import last from 'lodash/last'
import reduce from 'lodash/reduce'
import reverse from 'lodash/reverse'
import sortedIndexBy from 'lodash/sortedIndexBy'
import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useDebounce } from 'hooks/useDebounce/useDebounce'
import { useFetchPriceHistories } from 'hooks/useFetchPriceHistories/useFetchPriceHistories'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import {
  PriceHistoryData,
  selectPriceHistoriesLoadingByAssetTimeframe,
  selectPriceHistoryTimeframe
} from 'state/slices/marketDataSlice/marketDataSlice'
import {
  AccountSpecifier,
  PortfolioAssets,
  PortfolioBalancesById
} from 'state/slices/portfolioSlice/portfolioSlice'
import {
  selectPortfolioAssets,
  selectPortfolioCryptoBalancesByAccountId
} from 'state/slices/portfolioSlice/selectors'
import { selectTxsByFilter, Tx } from 'state/slices/txHistorySlice/txHistorySlice'
import { useAppSelector } from 'state/store'

type PriceAtBlockTimeArgs = {
  date: number
  assetPriceHistoryData: HistoryData[]
}

type PriceAtBlockTime = (args: PriceAtBlockTimeArgs) => number

export const priceAtBlockTime: PriceAtBlockTime = ({ date, assetPriceHistoryData }): number => {
  const { length } = assetPriceHistoryData
  // https://lodash.com/docs/4.17.15#sortedIndexBy - binary search rather than O(n)
  const i = sortedIndexBy(assetPriceHistoryData, { date, price: 0 }, ({ date }) => Number(date))
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
  assetIds: CAIP19[]
  balances: PortfolioBalancesById
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
  const { assetIds, balances, timeframe } = args

  // current asset balances, we iterate over this later and adjust on each tx
  const assetBalances = assetIds.reduce<CryptoBalance>((acc, cur) => {
    acc[cur] = bnOrZero(balances[cur])
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
  const date = end.valueOf()
  const { crypto } = balance
  const result = Object.entries(crypto).reduce((acc, [caip19, assetCryptoBalance]) => {
    const assetPriceHistoryData = priceHistoryData[caip19]
    if (!assetPriceHistoryData?.length) return acc
    const price = priceAtBlockTime({ assetPriceHistoryData, date })
    const portfolioAsset = portfolioAssets[caip19]
    if (!portfolioAsset) {
      return acc
    }
    const { precision } = portfolioAsset
    const assetFiatBalance = assetCryptoBalance.div(bn(10).exponentiatedBy(precision)).times(price)

    return acc.plus(assetFiatBalance)
  }, bn(0))

  return result
}

type CalculateBucketPricesArgs = {
  assetIds: CAIP19[]
  buckets: Bucket[]
  portfolioAssets: PortfolioAssets
  priceHistoryData: PriceHistoryData
}

type CalculateBucketPrices = (args: CalculateBucketPricesArgs) => Bucket[]

// note - this mutates buckets
export const calculateBucketPrices: CalculateBucketPrices = args => {
  const { assetIds, buckets, portfolioAssets, priceHistoryData } = args

  // we iterate from latest to oldest
  for (let i = buckets.length - 1; i >= 0; i--) {
    const bucket = buckets[i]
    const { txs } = bucket

    // copy the balance back from the most recent bucket
    const currentBalance = buckets[i + 1]?.balance ?? buckets[buckets.length - 1].balance
    bucket.balance = Object.assign({}, currentBalance)

    // if we have txs in this bucket, adjust the crypto balance in each bucket
    txs.forEach(tx => {
      if (tx.fee && assetIds.includes(tx.fee.caip19)) {
        // balance history being built in descending order, so fee means we had more before
        // TODO(0xdef1cafe): this is awful but gets us out of trouble
        if (tx.chain === ChainTypes.Ethereum) {
          bucket.balance.crypto[tx.fee.caip19] = bucket.balance.crypto[tx.fee.caip19].plus(
            bnOrZero(tx.fee.value)
          )
        }
      }

      tx.transfers.forEach(transfer => {
        const asset = transfer.caip19

        if (!assetIds.includes(asset)) return

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

type BucketsToChartData = (buckets: Bucket[]) => HistoryData[]

export const bucketsToChartData: BucketsToChartData = buckets => {
  return buckets.map(bucket => ({
    price: bn(bucket.balance.fiat).decimalPlaces(2).toNumber(),
    date: bucket.end.valueOf()
  }))
}

type UseBalanceChartDataReturn = {
  balanceChartData: Array<HistoryData>
  balanceChartDataLoading: boolean
}

type UseBalanceChartDataArgs = {
  assetIds: CAIP19[]
  accountId?: AccountSpecifier
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
  const { assetIds, accountId, timeframe } = args
  const accountIds = useMemo(() => (accountId ? [accountId] : []), [accountId])
  const [balanceChartDataLoading, setBalanceChartDataLoading] = useState(true)
  const [balanceChartData, setBalanceChartData] = useState<HistoryData[]>([])
  // dummy assetId - we're only filtering on account
  const balances = useAppSelector(state =>
    selectPortfolioCryptoBalancesByAccountId(state, accountId)
  )
  const portfolioAssets = useSelector(selectPortfolioAssets)
  const {
    state: { walletInfo }
  } = useWallet()

  const txFilter = useMemo(() => ({ assetIds, accountIds }), [assetIds, accountIds])
  // we can't tell if txs are finished loading over the websocket, so
  // debounce a bit before doing expensive computations
  const txs = useDebounce(
    useAppSelector(state => selectTxsByFilter(state, txFilter)),
    500
  )

  // the portfolio page is simple - consider all txs and all portfolio asset ids
  // across all accounts - just don't filter for accounts

  // there are a few different situations for
  // - top level asset pages - zero or more account ids
  // - an asset account page, e.g. show me the eth for 0xfoo - a single account id
  // - an account asset page, e.g. show me the fox for 0xbar - a single account id
  // this may seem complicated, but we just need txs filtered by account ids

  // kick off requests for all the price histories we need
  useFetchPriceHistories({ assetIds, timeframe })
  const priceHistoryData = useAppSelector(state => selectPriceHistoryTimeframe(state, timeframe))
  const priceHistoryDataLoading = useAppSelector(state =>
    selectPriceHistoriesLoadingByAssetTimeframe(state, assetIds, timeframe)
  )

  // loading state
  useEffect(() => setBalanceChartDataLoading(true), [setBalanceChartDataLoading, timeframe])

  // calculation
  useEffect(() => {
    // data prep
    const noDeviceId = isNil(walletInfo?.deviceId)
    const noAssetIds = !assetIds.length
    const noPriceHistory = priceHistoryDataLoading
    if (noDeviceId || noAssetIds || noPriceHistory) {
      return setBalanceChartDataLoading(true)
    }

    // create empty buckets based on the assets, current balances, and timeframe
    const emptyBuckets = makeBuckets({ assetIds, balances, timeframe })
    // put each tx into a bucket for the chart
    const buckets = bucketTxs(txs, emptyBuckets)

    // iterate each bucket, updating crypto balances and fiat prices per bucket
    const calculatedBuckets = calculateBucketPrices({
      assetIds,
      buckets,
      priceHistoryData,
      portfolioAssets
    })

    const chartData = bucketsToChartData(calculatedBuckets)

    setBalanceChartData(chartData)
    setBalanceChartDataLoading(false)
  }, [
    assetIds,
    accountIds,
    priceHistoryData,
    priceHistoryDataLoading,
    txs,
    timeframe,
    balances,
    setBalanceChartData,
    portfolioAssets,
    walletInfo?.deviceId
  ])

  const result = { balanceChartData, balanceChartDataLoading }
  return result
}
