import { AssetId, cosmosAssetId, cosmosChainId, toAccountId } from '@shapeshiftoss/caip'
import { TxStatus, TxType } from '@shapeshiftoss/chain-adapters'
import { RebaseHistory } from '@shapeshiftoss/investor-foxy'
import { HistoryData, HistoryTimeframe, KnownChainIds } from '@shapeshiftoss/types'
import { BigNumber } from 'bignumber.js'
import dayjs from 'dayjs'
import fill from 'lodash/fill'
import head from 'lodash/head'
import isEmpty from 'lodash/isEmpty'
import isNil from 'lodash/isNil'
import last from 'lodash/last'
import reduce from 'lodash/reduce'
import reverse from 'lodash/reverse'
import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { useDebounce } from 'hooks/useDebounce/useDebounce'
import { useFetchPriceHistories } from 'hooks/useFetchPriceHistories/useFetchPriceHistories'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { priceAtDate } from 'lib/charts'
import { logger } from 'lib/logger'
import { AccountSpecifier } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'
import { AssetsById } from 'state/slices/assetsSlice/assetsSlice'
import { PriceHistoryData } from 'state/slices/marketDataSlice/marketDataSlice'
import {
  PortfolioAssets,
  PortfolioBalancesById,
} from 'state/slices/portfolioSlice/portfolioSliceCommon'
import {
  selectAccountSpecifiers,
  selectAssets,
  selectCryptoPriceHistoryTimeframe,
  selectPortfolioAssets,
  selectPortfolioCryptoBalancesByAccountIdAboveThreshold,
  selectPriceHistoriesLoadingByAssetTimeframe,
  selectTotalStakingDelegationCryptoByAccountSpecifier,
  selectTxsByFilter,
} from 'state/slices/selectors'
import { selectRebasesByFilter } from 'state/slices/txHistorySlice/selectors'
import { Tx } from 'state/slices/txHistorySlice/txHistorySlice'
import { useAppSelector } from 'state/store'

import { includeStakedBalance, includeTransaction } from './cosmosUtils'

const moduleLogger = logger.child({ namespace: ['useBalanceChartData'] })

type CryptoBalance = {
  [k: AssetId]: BigNumber // map of asset to base units
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
  rebases: RebaseHistory[]
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
  assetIds: AssetId[]
  balances: PortfolioBalancesById
}

// adjust this to give charts more or less granularity
export const timeframeMap: Record<HistoryTimeframe, BucketMeta> = {
  [HistoryTimeframe.HOUR]: { count: 60, duration: 1, unit: 'minute' },
  [HistoryTimeframe.DAY]: { count: 289, duration: 5, unit: 'minutes' },
  [HistoryTimeframe.WEEK]: { count: 168, duration: 1, unit: 'hours' },
  [HistoryTimeframe.MONTH]: { count: 362, duration: 2, unit: 'hours' },
  [HistoryTimeframe.YEAR]: { count: 365, duration: 1, unit: 'days' },
  [HistoryTimeframe.ALL]: { count: 262, duration: 1, unit: 'weeks' },
}

type MakeBuckets = (args: MakeBucketsArgs) => MakeBucketsReturn

export const makeBuckets: MakeBuckets = args => {
  const { assetIds, balances, timeframe } = args

  // current asset balances, we iterate over this later and adjust on each tx
  const assetBalances = assetIds.reduce<CryptoBalance>((acc, cur) => {
    acc[cur] = bnOrZero(balances?.[cur])
    return acc
  }, {})

  const makeReducer = (duration: number, unit: dayjs.ManipulateType) => {
    const now = dayjs()
    return (acc: Array<Bucket>, _cur: unknown, idx: number) => {
      const end = now.subtract(idx * duration, unit)
      const start = end.subtract(duration, unit).add(1, 'second')
      const txs: Tx[] = []
      const rebases: RebaseHistory[] = []
      const balance = {
        crypto: assetBalances,
        fiat: bn(0),
      }
      const bucket = { start, end, txs, rebases, balance }
      acc.push(bucket)
      return acc
    }
  }

  const meta = timeframeMap[timeframe]
  const { count, duration, unit } = meta
  const buckets = reverse(reduce(fill(Array(count), 0), makeReducer(duration, unit), []))
  return { buckets, meta }
}

export const bucketEvents = (
  txs: Tx[],
  rebases: RebaseHistory[],
  bucketsAndMeta: MakeBucketsReturn,
): Bucket[] => {
  const { buckets, meta } = bucketsAndMeta
  const start = head(buckets)!.start
  const end = last(buckets)!.end

  // both txs and rebase events have the same blockTime property which is all we need
  const txAndRebaseEvents = [...txs, ...rebases]

  // events are potentially a lot longer than buckets, iterate the long list once
  return txAndRebaseEvents.reduce((acc, event) => {
    const eventDayJs = dayjs(event.blockTime * 1000) // unchained uses seconds
    const eventOutsideDomain = eventDayJs.isBefore(start) || eventDayJs.isAfter(end)
    if (eventOutsideDomain) return acc
    const { duration, unit } = meta
    // the number of time units from start of chart to this tx
    const bucketIndex = Math.floor(eventDayJs.diff(start, unit as dayjs.OpUnitType) / duration)
    if (bucketIndex < 0 || bucketIndex > buckets.length - 1) {
      console.error(
        `bucketTxs: event outside buckets: ${event}, start: ${start.valueOf()}, end: ${end.valueOf()}, meta: ${meta}`,
      )
      return acc
    }

    const isTx = (event: Tx | RebaseHistory): event is Tx => !!(event as Tx)?.txid
    // add to the correct bucket
    isTx(event) ? acc[bucketIndex].txs.push(event) : acc[bucketIndex].rebases.push(event)

    return acc
  }, buckets)
}

type FiatBalanceAtBucketArgs = {
  bucket: Bucket
  portfolioAssets: PortfolioAssets
  priceHistoryData: PriceHistoryData
}

type FiatBalanceAtBucket = (args: FiatBalanceAtBucketArgs) => BigNumber

const fiatBalanceAtBucket: FiatBalanceAtBucket = ({
  bucket,
  priceHistoryData,
  portfolioAssets,
}) => {
  const { balance, end } = bucket
  const date = end.valueOf()
  const { crypto } = balance

  return Object.entries(crypto).reduce((acc, [assetId, assetCryptoBalance]) => {
    const assetPriceHistoryData = priceHistoryData[assetId]
    if (!assetPriceHistoryData?.length) return acc
    const price = priceAtDate({ priceHistoryData: assetPriceHistoryData, date })
    const portfolioAsset = portfolioAssets[assetId]
    if (!portfolioAsset) {
      return acc
    }
    const { precision } = portfolioAsset
    const assetFiatBalance = assetCryptoBalance.div(bn(10).exponentiatedBy(precision)).times(price)
    return acc.plus(assetFiatBalance)
  }, bn(0))
}

type CalculateBucketPricesArgs = {
  assetIds: AssetId[]
  buckets: Bucket[]
  portfolioAssets: PortfolioAssets
  priceHistoryData: PriceHistoryData
  delegationTotal: string
}

type CalculateBucketPrices = (args: CalculateBucketPricesArgs) => Bucket[]

// note - this mutates buckets
export const calculateBucketPrices: CalculateBucketPrices = args => {
  const { assetIds, buckets, portfolioAssets, priceHistoryData, delegationTotal } = args

  const startingBucket = buckets[buckets.length - 1]

  // add total cosmos staked balance to starting balance if cosmos is in assetIds
  buckets[buckets.length - 1] = includeStakedBalance(startingBucket, delegationTotal, assetIds)

  // we iterate from latest to oldest
  for (let i = buckets.length - 1; i >= 0; i--) {
    const bucket = buckets[i]
    const { rebases, txs } = bucket

    // copy the balance back from the most recent bucket
    const currentBalance = buckets[i + 1]?.balance ?? startingBucket.balance

    bucket.balance = Object.assign({}, currentBalance)

    // if we have txs in this bucket, adjust the crypto balance in each bucket
    txs.forEach(tx => {
      if (tx.fee && assetIds.includes(tx.fee.assetId)) {
        // balance history being built in descending order, so fee means we had more before
        // TODO(0xdef1cafe): this is awful but gets us out of trouble
        // NOTE: related to utxo balance tracking, just ignoring bitcoin for now as our only utxo chain support
        if (tx.chain !== KnownChainIds.BitcoinMainnet) {
          bucket.balance.crypto[tx.fee.assetId] = bucket.balance.crypto[tx.fee.assetId].plus(
            bnOrZero(tx.fee.value),
          )
        }
      }

      // Identify Special cases where we should not include cosmos delegate/undelegate txs in chart balance
      const includeTx = includeTransaction(tx)

      tx.transfers.forEach(transfer => {
        const asset = transfer.assetId

        if (!assetIds.includes(asset)) return
        if (!includeTx) return
        if (tx.status === TxStatus.Failed) return

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

    rebases.forEach(rebase => {
      const { assetId, balanceDiff } = rebase
      if (!assetIds.includes(assetId)) return
      // UP ONLY - rebase events can only go up, we don't have to consider the case adjusting balances down
      // we're going backwards, so a rebase means we had less before
      bucket.balance.crypto[assetId] = bnOrZero(bucket.balance.crypto[assetId]).minus(balanceDiff)
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
    date: bucket.end.valueOf(),
  }))
}

type UseBalanceChartDataReturn = {
  balanceChartData: Array<HistoryData>
  balanceChartDataLoading: boolean
}

type UseBalanceChartDataArgs = {
  assetIds: AssetId[]
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
  const assets = useAppSelector(selectAssets)
  const accountIds = useMemo(() => (accountId ? [accountId] : []), [accountId])
  const [balanceChartDataLoading, setBalanceChartDataLoading] = useState(true)
  const [balanceChartData, setBalanceChartData] = useState<HistoryData[]>([])
  // dummy assetId - we're only filtering on account
  const balances = useAppSelector(state =>
    selectPortfolioCryptoBalancesByAccountIdAboveThreshold(state, accountId),
  )

  // Get total delegation
  // TODO(ryankk): consolidate accountSpecifiers creation to be the same everywhere
  const accountSpecifiers = useSelector(selectAccountSpecifiers)
  const account = accountSpecifiers.reduce((acc, accountSpecifier) => {
    if (accountSpecifier[cosmosChainId]) {
      acc = accountSpecifier[cosmosChainId]
    }
    return acc
  }, '')

  const cosmosAccountSpecifier = account ? toAccountId({ chainId: cosmosChainId, account }) : ''

  const delegationTotal = useAppSelector(state =>
    selectTotalStakingDelegationCryptoByAccountSpecifier(state, {
      accountSpecifier: cosmosAccountSpecifier,
      assetId: cosmosAssetId,
    }),
  )

  const portfolioAssets = useSelector(selectPortfolioAssets)
  const {
    state: { walletInfo },
  } = useWallet()

  const txFilter = useMemo(() => ({ assetIds, accountIds }), [assetIds, accountIds])

  // we can't tell if txs are finished loading over the websocket, so
  // debounce a bit before doing expensive computations
  const txs = useDebounce(
    useAppSelector(state => selectTxsByFilter(state, txFilter)),
    500,
  )

  // rebasing token balances can be adjusted by rebase events rather than txs
  // and we need to account for this in charts
  const rebases = useAppSelector(state => selectRebasesByFilter(state, txFilter))

  // the portfolio page is simple - consider all txs and all portfolio asset ids
  // across all accounts - just don't filter for accounts

  // there are a few different situations for
  // - top level asset pages - zero or more account ids
  // - an asset account page, e.g. show me the eth for 0xfoo - a single account id
  // - an account asset page, e.g. show me the fox for 0xbar - a single account id
  // this may seem complicated, but we just need txs filtered by account ids

  // kick off requests for all the price histories we need
  useFetchPriceHistories({ assetIds, timeframe })
  const priceHistoryData = useAppSelector(state =>
    selectCryptoPriceHistoryTimeframe(state, timeframe),
  )
  const priceHistoryDataLoading = useAppSelector(state =>
    selectPriceHistoriesLoadingByAssetTimeframe(state, assetIds, timeframe),
  )

  // loading state
  useEffect(() => setBalanceChartDataLoading(true), [setBalanceChartDataLoading, timeframe])

  // calculation
  useEffect(() => {
    // data prep
    const hasNoDeviceId = isNil(walletInfo?.deviceId)
    const hasNoAssetIds = !assetIds.length
    const hasNoPriceHistoryData = isEmpty(priceHistoryData)
    if (hasNoDeviceId || hasNoAssetIds || priceHistoryDataLoading || hasNoPriceHistoryData) {
      return setBalanceChartDataLoading(true)
    }

    // create empty buckets based on the assets, current balances, and timeframe
    const emptyBuckets = makeBuckets({ assetIds, balances, timeframe })
    // put each tx into a bucket for the chart
    const buckets = bucketEvents(txs, rebases, emptyBuckets)

    // iterate each bucket, updating crypto balances and fiat prices per bucket
    const calculatedBuckets = calculateBucketPrices({
      assetIds,
      buckets,
      priceHistoryData,
      portfolioAssets,
      delegationTotal,
    })

    debugCharts({ assets, calculatedBuckets, timeframe, txs })

    const chartData = bucketsToChartData(calculatedBuckets)

    setBalanceChartData(chartData)
    setBalanceChartDataLoading(false)
  }, [
    assets,
    assetIds,
    accountIds,
    priceHistoryData,
    priceHistoryDataLoading,
    txs,
    timeframe,
    balances,
    setBalanceChartData,
    portfolioAssets,
    walletInfo?.deviceId,
    rebases,
    delegationTotal,
  ])

  return { balanceChartData, balanceChartDataLoading }
}

type DebugChartsArgs = {
  assets: AssetsById
  timeframe: HistoryTimeframe
  calculatedBuckets: Bucket[]
  txs: Tx[]
}

type DebugCharts = (args: DebugChartsArgs) => void

const debugCharts: DebugCharts = ({ assets, calculatedBuckets, timeframe, txs }) => {
  if (timeframe !== HistoryTimeframe.ALL) return
  /**
   * there is a long tail of potentially obscure bugs in the charts
   * the best way to address this is log when it happens, and fix the edge cases
   */
  if (!txs?.length) return // no chart if no txs
  const firstTxTimestamp = txs[0].blockTime * 1000 // unchained uses seconds
  const firstBucket = calculatedBuckets[0]
  const startOfChartTimestamp = firstBucket.start.valueOf()
  const shouldHaveZeroBalance = firstTxTimestamp > startOfChartTimestamp
  if (!shouldHaveZeroBalance) return
  Object.entries(firstBucket.balance.crypto).forEach(([assetId, balance]) => {
    if (balance.eq(0)) return // this is expected, charts should be zero at the beginning
    /**
     * at this point, we have a non zero balance for an asset at the start of the chart
     * but the earlierst tx is after the start of the chart - this should not happen
     * and something is wrong
     */
    const asset = assets[assetId]
    const baseUnitBalance = balance.toString()
    const baseUnitHuman = balance.div(bn(10).exponentiatedBy(asset.precision)).toString()
    moduleLogger.error(
      { asset, assetId, baseUnitBalance, baseUnitHuman, balance },
      'NON-ZERO BALANCE AT START OF CHART',
    )
  })
}
