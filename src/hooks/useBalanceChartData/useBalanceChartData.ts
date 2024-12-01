import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromChainId } from '@shapeshiftoss/caip'
import type { AssetsByIdPartial, HistoryData } from '@shapeshiftoss/types'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import { TransferType, TxStatus } from '@shapeshiftoss/unchained-client'
import type { BigNumber } from 'bignumber.js'
import dayjs from 'dayjs'
import head from 'lodash/head'
import intersection from 'lodash/intersection'
import isEmpty from 'lodash/isEmpty'
import last from 'lodash/last'
import values from 'lodash/values'
import without from 'lodash/without'
import { useMemo } from 'react'
import { useFetchPriceHistories } from 'hooks/useFetchPriceHistories/useFetchPriceHistories'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { priceAtDate } from 'lib/charts'
import type { SupportedFiatCurrencies } from 'lib/market-service'
import type { PriceHistoryData } from 'state/slices/marketDataSlice/types'
import type { AssetBalancesById } from 'state/slices/portfolioSlice/portfolioSliceCommon'
import {
  selectAssets,
  selectBalanceChartCryptoBalancesByAccountIdAboveThreshold,
  selectCryptoPriceHistoryTimeframe,
  selectFiatPriceHistoryTimeframe,
  selectIsTxHistoryAvailableByFilter,
  selectSelectedCurrency,
  selectTxsByFilter,
  selectWalletId,
} from 'state/slices/selectors'
import type { Tx } from 'state/slices/txHistorySlice/txHistorySlice'
import { useAppSelector } from 'state/store'

import { excludeTransaction } from './cosmosUtils'
import { CHART_ASSET_ID_BLACKLIST, makeBalanceChartData } from './utils'

type BalanceByAssetId = Record<AssetId, BigNumber> // map of asset to base units

type BucketBalance = {
  crypto: BalanceByAssetId
  fiat: BalanceByAssetId
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
  buckets: Bucket[]
  meta: BucketMeta
}

type MakeBucketsArgs = {
  timeframe: HistoryTimeframe
  assetIds: AssetId[]
  balances: AssetBalancesById
}

// PERF: limit buckets to a limited number to prevent performance issues
const NUM_BUCKETS = 100

// adjust this to give charts more or less granularity
export const timeframeMap: Record<HistoryTimeframe, BucketMeta> = {
  [HistoryTimeframe.HOUR]: { count: NUM_BUCKETS, duration: 60 / NUM_BUCKETS, unit: 'minute' },
  [HistoryTimeframe.DAY]: {
    count: NUM_BUCKETS,
    duration: (24 * 60) / NUM_BUCKETS,
    unit: 'minutes',
  },
  [HistoryTimeframe.WEEK]: { count: NUM_BUCKETS, duration: (7 * 24) / NUM_BUCKETS, unit: 'hours' },
  [HistoryTimeframe.MONTH]: {
    count: NUM_BUCKETS,
    duration: (31 * 24) / NUM_BUCKETS,
    unit: 'hours',
  },
  [HistoryTimeframe.YEAR]: { count: NUM_BUCKETS, duration: 365 / NUM_BUCKETS, unit: 'days' },
  [HistoryTimeframe.ALL]: { count: NUM_BUCKETS, duration: 1, unit: 'weeks' },
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

  const now = dayjs()

  const meta = timeframeMap[timeframe]
  const { count, duration, unit } = meta

  const buckets = Array(count)
    .fill(undefined)
    .map((_value, idx) => {
      const end = now.subtract(idx * duration, unit)
      const start = end.subtract(duration, unit).add(1, 'second')
      const txs: Tx[] = []
      const balance = {
        crypto: assetBalances,
        fiat: zeroAssetBalances,
      }
      return { start, end, txs, balance }
    })
    .reverse()

  return { buckets, meta }
}

export const bucketEvents = (txs: Tx[], bucketsAndMeta: MakeBucketsReturn): Bucket[] => {
  const { buckets, meta } = bucketsAndMeta
  const start = head(buckets)!.start
  const end = last(buckets)!.end

  // events are potentially a lot longer than buckets, iterate the long list once
  return txs.reduce((acc, event) => {
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

    // add to the correct bucket
    acc[bucketIndex].txs.push(event)

    return acc
  }, buckets)
}

type FiatBalanceAtBucketArgs = {
  bucket: Bucket
  assets: AssetsByIdPartial
  cryptoPriceHistoryData: PriceHistoryData<AssetId>
  fiatPriceHistoryData: HistoryData[]
  selectedCurrency: SupportedFiatCurrencies
}

type FiatBalanceAtBucket = (args: FiatBalanceAtBucketArgs) => BalanceByAssetId

const fiatBalanceAtBucket: FiatBalanceAtBucket = ({
  bucket,
  cryptoPriceHistoryData,
  fiatPriceHistoryData,
  assets,
  selectedCurrency,
}) => {
  const date = bucket.end.valueOf()
  const balanceAtBucket: Record<AssetId, BigNumber> = {}
  const isUSD = selectedCurrency === 'USD'
  const fiatToUsdRate = isUSD
    ? 1 // don't convert USD to USD
    : // fallback to 1 if fiat data is missing, note || required over ?? here
      priceAtDate({ priceHistoryData: fiatPriceHistoryData, date }) || 1

  for (const [assetId, assetCryptoBalance] of Object.entries(bucket.balance.crypto)) {
    if (!cryptoPriceHistoryData[assetId]?.length) continue
    if (!assets[assetId]) continue
    const price = priceAtDate({ priceHistoryData: cryptoPriceHistoryData[assetId]!, date })
    balanceAtBucket[assetId] = assetCryptoBalance
      .times(`1e-${assets[assetId]?.precision!}`)
      .times(price)
    // dont unnecessarily multiply again
    if (!isUSD) balanceAtBucket[assetId] = balanceAtBucket[assetId].times(fiatToUsdRate)
  }

  return balanceAtBucket
}

type CalculateBucketPricesArgs = {
  assetIds: AssetId[]
  buckets: Bucket[]
  assets: AssetsByIdPartial
  cryptoPriceHistoryData: PriceHistoryData<AssetId>
  fiatPriceHistoryData: HistoryData[]
  selectedCurrency: SupportedFiatCurrencies
}

type CalculateBucketPrices = (args: CalculateBucketPricesArgs) => Bucket[]

// note - this mutates buckets
export const calculateBucketPrices: CalculateBucketPrices = args => {
  const {
    assetIds,
    buckets,
    assets,
    cryptoPriceHistoryData,
    fiatPriceHistoryData,
    selectedCurrency,
  } = args

  const startingBucket = buckets[buckets.length - 1]

  // we iterate from latest to oldest
  for (let i = buckets.length - 1; i >= 0; i--) {
    const bucket = buckets[i]
    const { txs } = bucket

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
          default:
            break
        }
      })
    })

    bucket.balance.fiat = fiatBalanceAtBucket({
      bucket,
      cryptoPriceHistoryData,
      fiatPriceHistoryData,
      assets,
      selectedCurrency,
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

/*
  we take the current asset balances, and work backwards, updating crypto
  balances and fiat prices for each time interval (bucket) of the chart
*/
export const useBalanceChartData = (
  timeframe: HistoryTimeframe,
  assetId?: AssetId,
  accountId?: AccountId,
) => {
  const assets = useAppSelector(selectAssets)
  const walletId = useAppSelector(selectWalletId)

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

  const selectedCurrency = useAppSelector(selectSelectedCurrency)

  // kick off requests for all the price histories we need
  useFetchPriceHistories(assetIds, timeframe)
  const cryptoPriceHistoryData = useAppSelector(state =>
    selectCryptoPriceHistoryTimeframe(state, timeframe),
  )

  const fiatPriceHistoryData = useAppSelector(state =>
    selectFiatPriceHistoryTimeframe(state, timeframe),
  )

  const isTxHistoryAvailableFilter = useMemo(
    () => ({ accountId, timeframe }),
    [accountId, timeframe],
  )
  const isTxHistoryAvailable = useAppSelector(state =>
    selectIsTxHistoryAvailableByFilter(state, isTxHistoryAvailableFilter),
  )

  const isInitializing = useMemo(() => {
    const noPriceHistoryData = !values(cryptoPriceHistoryData).flat().length
    return (
      !walletId ||
      !assetIds.length ||
      isEmpty(balances) ||
      noPriceHistoryData ||
      !isTxHistoryAvailable
    )
  }, [assetIds.length, balances, cryptoPriceHistoryData, isTxHistoryAvailable, walletId])

  const balanceChartData = useMemo(() => {
    // create empty buckets based on the assets, current balances, and timeframe
    const emptyBuckets = makeBuckets({
      assetIds,
      balances,
      timeframe,
    })
    // put each tx into a bucket for the chart
    const buckets = bucketEvents(txs, emptyBuckets)

    // iterate each bucket, updating crypto balances and fiat prices per bucket
    const calculatedBuckets = calculateBucketPrices({
      assetIds,
      buckets,
      cryptoPriceHistoryData,
      fiatPriceHistoryData,
      assets,
      selectedCurrency,
    })

    return bucketsToChartData(calculatedBuckets)
  }, [
    cryptoPriceHistoryData,
    assetIds,
    balances,
    timeframe,
    txs,
    fiatPriceHistoryData,
    assets,
    selectedCurrency,
  ])

  const loadingBalanceChartData = useMemo(() => {
    return {
      balanceChartDataLoading: true,
      balanceChartData: makeBalanceChartData(),
    }
  }, [])

  const loadedBalanceChartData = useMemo(() => {
    return {
      balanceChartDataLoading: false,
      balanceChartData,
    }
  }, [balanceChartData])

  return isInitializing ? loadingBalanceChartData : loadedBalanceChartData
}
