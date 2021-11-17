import { CAIP2, caip2, CAIP19, caip19 } from '@shapeshiftoss/caip'
import {
  Asset,
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
import isNil from 'lodash/isNil'
import reduce from 'lodash/reduce'
import reverse from 'lodash/reverse'
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useCAIP19Balances } from 'hooks/useBalances/useCAIP19Balances'
import { useDebounce } from 'hooks/useDebounce/useDebounce'
import { usePortfolioAssets } from 'hooks/usePortfolioAssets/usePortfolioAssets'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { usePriceHistory } from 'pages/Assets/hooks/usePriceHistory/usePriceHistory'
import { ReduxState } from 'state/reducer'
import { selectTxHistory, Tx } from 'state/slices/txHistorySlice/txHistorySlice'

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

type CryptoBalance = {
  [k: CAIP19]: number // map of asset to base units
}

type BucketBalance = {
  crypto: CryptoBalance
  fiat: number
}

type Bucket = {
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

type MakeBuckets = (args: MakeBucketsArgs) => MakeBucketsReturn

export const makeBuckets: MakeBuckets = args => {
  const { assets, balances, timeframe } = args

  // current asset balances, we iterate over this later and adjust on each tx
  const assetBalances = assets.reduce<CryptoBalance>((acc, cur) => {
    const account = balances[cur]
    if (!account) return acc // we don't have a balance for this asset, e.g. metamask bitcoin
    acc[cur] = Number(account.balance)
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
    [HistoryTimeframe.DAY]: { count: 285, duration: 5, unit: 'minutes' },
    [HistoryTimeframe.WEEK]: { count: 168, duration: 1, unit: 'hours' },
    [HistoryTimeframe.MONTH]: { count: 360, duration: 2, unit: 'hours' },
    [HistoryTimeframe.YEAR]: { count: 365, duration: 1, unit: 'days' },
    [HistoryTimeframe.ALL]: { count: 260, duration: 1, unit: 'weeks' }
  }

  const meta = timeframeMap[timeframe]
  const { count, duration, unit } = meta
  const buckets = reverse(reduce(fill(Array(count), 0), makeReducer(duration, unit), []))
  return { buckets, meta }
}

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
  // txs are potentially a lot longer than buckets, iterate the long list once
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
  portfolioAssets: {
    [k: CAIP19]: Asset
  }
  priceHistoryData: {
    [k: CAIP19]: HistoryData[]
  }
}

type FiatBalanceAtBucketReturn = number

type FiatBalanceAtBucket = (args: FiatBalanceAtBucketArgs) => FiatBalanceAtBucketReturn

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
    const { precision } = portfolioAsset
    const assetFiatBalance = bn(assetCryptoBalance)
      .div(bn(10).exponentiatedBy(precision))
      .times(price)
      .toNumber()
    return acc + assetFiatBalance
  }, 0)
  return result
}

type CalculateBucketPricesArgs = {
  assets: CAIP19[]
  buckets: Bucket[]
  portfolioAssets: {
    [k: CAIP19]: Asset
  }
  priceHistoryData: {
    [k: CAIP19]: HistoryData[]
  }
}

type CalculateBucketPrices = (args: CalculateBucketPricesArgs) => Bucket[]

// note - this mutates buckets
const calculateBucketPrices: CalculateBucketPrices = (args): Bucket[] => {
  const { assets, buckets, portfolioAssets, priceHistoryData } = args
  // we iterate from latest to oldest
  for (let i = buckets.length - 1; i >= 0; i--) {
    const bucket = buckets[i]
    const { txs } = bucket

    // copy the balance back from the most recent bucket
    bucket.balance = Object.assign(
      {},
      buckets[i + 1]?.balance || buckets[buckets.length - 1].balance
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
          console.warn(`calculateBucketPrices: unknown tx type ${type}`)
          break
        }
      }
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
  const {
    state: { walletInfo }
  } = useWallet()
  // portfolioAssets are all assets in a users portfolio
  const { portfolioAssets, portfolioAssetsLoading } = usePortfolioAssets()
  // we can't tell if txs are finished loading over the websocket, so
  // debounce a bit before doing expensive computations
  const txs = useDebounce(
    useSelector((state: ReduxState) => selectTxHistory(state, {})),
    500
  )
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
      assets,
      buckets,
      priceHistoryData,
      portfolioAssets
    })

    const balanceChartData: Array<HistoryData> = calculatedBuckets.map(bucket => ({
      // TODO(0xdef1cafe): update charts to accept price or balance
      price: bn(bucket.balance.fiat).decimalPlaces(2).toNumber(),
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
    setBalanceChartData,
    portfolioAssetsLoading,
    portfolioAssets,
    walletInfo?.deviceId
  ])

  const result = { balanceChartData, balanceChartDataLoading }
  return result
}
