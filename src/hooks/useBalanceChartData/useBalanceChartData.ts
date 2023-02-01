import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromChainId } from '@shapeshiftoss/caip'
import type { RebaseHistory } from '@shapeshiftoss/investor-foxy'
import type { HistoryData } from '@shapeshiftoss/types'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import { TransferType, TxStatus } from '@shapeshiftoss/unchained-client'
import type { BigNumber } from 'bignumber.js'
import dayjs from 'dayjs'
import fill from 'lodash/fill'
import head from 'lodash/head'
import intersection from 'lodash/intersection'
import isEmpty from 'lodash/isEmpty'
import last from 'lodash/last'
import reduce from 'lodash/reduce'
import reverse from 'lodash/reverse'
import values from 'lodash/values'
import without from 'lodash/without'
import { useEffect, useMemo, useState } from 'react'
import { useFetchPriceHistories } from 'hooks/useFetchPriceHistories/useFetchPriceHistories'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { priceAtDate } from 'lib/charts'
import { logger } from 'lib/logger'
import type { AssetsById } from 'state/slices/assetsSlice/assetsSlice'
import type { PriceHistoryData } from 'state/slices/marketDataSlice/types'
import type { AssetBalancesById } from 'state/slices/portfolioSlice/portfolioSliceCommon'
import {
  selectAssets,
  selectBalanceChartCryptoBalancesByAccountIdAboveThreshold,
  selectCryptoPriceHistoryTimeframe,
  selectFiatPriceHistoryTimeframe,
  selectRebasesByFilter,
  selectTxsByFilter,
  selectWalletId,
} from 'state/slices/selectors'
import type { Tx } from 'state/slices/txHistorySlice/txHistorySlice'
import { useAppSelector } from 'state/store'

import { excludeTransaction } from './cosmosUtils'
import { CHART_ASSET_ID_BLACKLIST, makeBalanceChartData } from './utils'

const moduleLogger = logger.child({ namespace: ['useBalanceChartData'] })

type BalanceByAssetId = {
  [k: AssetId]: BigNumber // map of asset to base units
}

type BucketBalance = {
  crypto: BalanceByAssetId
  fiat: BalanceByAssetId
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
  buckets: Bucket[]
  meta: BucketMeta
}

type MakeBucketsArgs = {
  timeframe: HistoryTimeframe
  assetIds: AssetId[]
  balances: AssetBalancesById
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
  const assetBalances = assetIds.reduce<BalanceByAssetId>((acc, cur) => {
    acc[cur] = bnOrZero(balances?.[cur])
    return acc
  }, {})

  const zeroAssetBalances = assetIds.reduce<BalanceByAssetId>((acc, cur) => {
    acc[cur] = bnOrZero(0)
    return acc
  }, {})

  const makeReducer = (duration: number, unit: dayjs.ManipulateType) => {
    const now = dayjs()
    return (acc: Bucket[], _cur: unknown, idx: number) => {
      const end = now.subtract(idx * duration, unit)
      const start = end.subtract(duration, unit).add(1, 'second')
      const txs: Tx[] = []
      const rebases: RebaseHistory[] = []
      const balance = {
        crypto: assetBalances,
        fiat: zeroAssetBalances,
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
      moduleLogger.error(
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
  assets: AssetsById
  cryptoPriceHistoryData: PriceHistoryData
  fiatPriceHistoryData: HistoryData[]
}

type FiatBalanceAtBucket = (args: FiatBalanceAtBucketArgs) => BalanceByAssetId

const fiatBalanceAtBucket: FiatBalanceAtBucket = ({
  bucket,
  cryptoPriceHistoryData,
  fiatPriceHistoryData,
  assets,
}) => {
  const { balance, end } = bucket
  const date = end.valueOf()
  const { crypto } = balance
  const initial: Record<AssetId, BigNumber> = {}

  return Object.entries(crypto).reduce((acc, [assetId, assetCryptoBalance]) => {
    const assetPriceHistoryData = cryptoPriceHistoryData[assetId]
    if (!assetPriceHistoryData?.length) return acc
    const portfolioAsset = assets[assetId]
    if (!portfolioAsset) return acc
    const price = priceAtDate({ priceHistoryData: assetPriceHistoryData, date })
    // fallback to 1 if fiat data is missing, note || required over ?? here
    const fiatToUsdRate = priceAtDate({ priceHistoryData: fiatPriceHistoryData, date }) || 1
    const { precision } = portfolioAsset
    const assetFiatBalance = assetCryptoBalance
      .div(bn(10).exponentiatedBy(precision))
      .times(price)
      .times(fiatToUsdRate)
    acc[assetId] = assetFiatBalance
    return acc
  }, initial)
}

type CalculateBucketPricesArgs = {
  assetIds: AssetId[]
  buckets: Bucket[]
  assets: AssetsById
  cryptoPriceHistoryData: PriceHistoryData
  fiatPriceHistoryData: HistoryData[]
}

type CalculateBucketPrices = (args: CalculateBucketPricesArgs) => Bucket[]

// note - this mutates buckets
export const calculateBucketPrices: CalculateBucketPrices = args => {
  const { assetIds, buckets, assets, cryptoPriceHistoryData, fiatPriceHistoryData } = args

  const startingBucket = buckets[buckets.length - 1]

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
        // don't count fees for UTXO chains
        if (fromChainId(tx.chainId).chainNamespace !== CHAIN_NAMESPACE.Utxo) {
          // balance history being built in descending order, so fee means we had more before
          bucket.balance.crypto[tx.fee.assetId] = bucket.balance.crypto[tx.fee.assetId].plus(
            bnOrZero(tx.fee.value),
          )
        }
      }

      // Identify Special cases where we should exclude cosmos delegate/undelegate/claim txs in chart balance
      const excludeTx = excludeTransaction(tx)

      tx.transfers.forEach(transfer => {
        const asset = transfer.assetId

        if (!assetIds.includes(asset)) return
        if (excludeTx) return
        if (tx.status === TxStatus.Failed) return

        const bucketValue = bnOrZero(bucket.balance.crypto[asset])
        const transferValue = bnOrZero(transfer.value)
        switch (transfer.type) {
          case TransferType.Send:
            // we're going backwards, so a send means we had more before
            bucket.balance.crypto[asset] = bucketValue.plus(transferValue)
            break
          case TransferType.Receive:
            // we're going backwards, so a receive means we had less before
            bucket.balance.crypto[asset] = bucketValue.minus(transferValue)
            break
          default: {
            moduleLogger.warn(`calculateBucketPrices: unknown tx type ${transfer.type}`)
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

    bucket.balance.fiat = fiatBalanceAtBucket({
      bucket,
      cryptoPriceHistoryData,
      fiatPriceHistoryData,
      assets,
    })
    buckets[i] = bucket
  }
  return buckets
}

type BucketsToChartData = (buckets: Bucket[]) => BalanceChartData

export const bucketsToChartData: BucketsToChartData = buckets => {
  const initial: BalanceChartData = makeBalanceChartData()

  const result = buckets.reduce((acc, bucket) => {
    const date = bucket.end.valueOf()
    const initial: Record<'total' | AssetId, number> = { total: 0 }
    const bucketByAssetIdAndTotal = Object.entries(bucket.balance.fiat).reduce(
      (acc, [assetId, fiatBalance]) => {
        const assetFiatBalance = fiatBalance.decimalPlaces(2).toNumber()
        acc[assetId] = assetFiatBalance
        acc.total += assetFiatBalance
        return acc
      },
      initial,
    )
    const totalData = { date, price: bucketByAssetIdAndTotal.total }
    const rainbowData = { date, ...bucketByAssetIdAndTotal }
    acc.total.push(totalData)
    acc.rainbow.push(rainbowData)
    return acc
  }, initial)

  return result
}

export type RainbowData = {
  date: number
  total: number
  [k: AssetId]: number
}

export type BalanceChartData = {
  total: HistoryData[]
  rainbow: RainbowData[]
}

type UseBalanceChartDataReturn = {
  balanceChartData: BalanceChartData
  balanceChartDataLoading: boolean
}

type UseBalanceChartDataArgs = {
  assetId?: AssetId
  accountId?: AccountId
  timeframe: HistoryTimeframe
}

type UseBalanceChartData = (args: UseBalanceChartDataArgs) => UseBalanceChartDataReturn

/*
  we take the current asset balances, and work backwards, updating crypto
  balances and fiat prices for each time interval (bucket) of the chart
*/
export const useBalanceChartData: UseBalanceChartData = args => {
  const { assetId, accountId, timeframe } = args
  const assets = useAppSelector(selectAssets)
  const walletId = useAppSelector(selectWalletId)
  const [balanceChartDataLoading, setBalanceChartDataLoading] = useState(true)
  const [balanceChartData, setBalanceChartData] = useState<BalanceChartData>(makeBalanceChartData())

  const filter = useMemo(() => ({ accountId }), [accountId])
  const balances = useAppSelector(s =>
    selectBalanceChartCryptoBalancesByAccountIdAboveThreshold(s, filter),
  )

  const assetIdsWithBalancesAboveThreshold = useMemo(() => Object.keys(balances), [balances])

  /**
   * for rainbow charts on the dashboard, we want the chart to match the AccountTable below
   * and respect the balance threshold, i.e. we don't want to render zero balances chart lines
   * for assets with a current balance that falls below the user's specified balance threshold
   */
  const intersectedAssetIds = useMemo(
    () =>
      assetId
        ? intersection(assetIdsWithBalancesAboveThreshold, [assetId])
        : assetIdsWithBalancesAboveThreshold,
    [assetIdsWithBalancesAboveThreshold, assetId],
  )

  // remove blacklisted assets that we can't obtain exhaustive tx data for
  const assetIds = useMemo(
    () => without(intersectedAssetIds, ...CHART_ASSET_ID_BLACKLIST),
    [intersectedAssetIds],
  )

  const txFilter = useMemo(() => ({ assetId, accountId }), [assetId, accountId])
  const txs = useAppSelector(state => selectTxsByFilter(state, txFilter))

  // rebasing token balances can be adjusted by rebase events rather than txs
  // and we need to account for this in charts
  const rebases = useAppSelector(state => selectRebasesByFilter(state, txFilter))

  // kick off requests for all the price histories we need
  useFetchPriceHistories({ assetIds, timeframe })
  const cryptoPriceHistoryData = useAppSelector(state =>
    selectCryptoPriceHistoryTimeframe(state, timeframe),
  )

  const fiatPriceHistoryData = useAppSelector(state =>
    selectFiatPriceHistoryTimeframe(state, timeframe),
  )
  // loading state
  useEffect(() => setBalanceChartDataLoading(true), [setBalanceChartDataLoading, timeframe])

  // calculation
  useEffect(() => {
    const noPriceHistoryData = !values(cryptoPriceHistoryData).flat().length
    if (!walletId || !assetIds.length || isEmpty(balances) || noPriceHistoryData) {
      return setBalanceChartDataLoading(true)
    }

    // create empty buckets based on the assets, current balances, and timeframe
    const emptyBuckets = makeBuckets({
      assetIds,
      balances,
      timeframe,
    })
    // put each tx into a bucket for the chart
    const buckets = bucketEvents(txs, rebases, emptyBuckets)

    // iterate each bucket, updating crypto balances and fiat prices per bucket
    const calculatedBuckets = calculateBucketPrices({
      assetIds,
      buckets,
      cryptoPriceHistoryData,
      fiatPriceHistoryData,
      assets,
    })

    debugCharts({ assets, calculatedBuckets, timeframe, txs })

    const chartData = bucketsToChartData(calculatedBuckets)

    setBalanceChartData(chartData)
    setBalanceChartDataLoading(false)
  }, [
    assets,
    assetIds,
    accountId,
    cryptoPriceHistoryData,
    fiatPriceHistoryData,
    txs,
    timeframe,
    balances,
    setBalanceChartData,
    walletId,
    rebases,
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
    const baseUnitHuman = balance.div(bn(10).exponentiatedBy(asset?.precision ?? 1)).toString()
    moduleLogger.error(
      { asset, assetId, baseUnitBalance, baseUnitHuman, balance },
      'NON-ZERO BALANCE AT START OF CHART',
    )
  })
}
