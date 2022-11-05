import { ethAssetId, foxAssetId } from '@keepkey/caip'
import type { RebaseHistory } from '@keepkey/investor-foxy'
import type { HistoryData } from '@keepkey/types'
import { HistoryTimeframe } from '@keepkey/types'
import { ethereum, fox } from 'test/mocks/assets'
import { ethereumTransactions, FOXSend } from 'test/mocks/txs'
import { bn } from 'lib/bignumber/bignumber'
import type { PriceHistoryData } from 'state/slices/marketDataSlice/marketDataSlice'
import type { PortfolioAssets } from 'state/slices/portfolioSlice/portfolioSliceCommon'

import type { Bucket } from './useBalanceChartData'
import {
  bucketEvents,
  calculateBucketPrices,
  makeBuckets,
  timeframeMap,
} from './useBalanceChartData'

const mockedDate = '2021-11-20T00:00:00Z'

describe('makeBuckets', () => {
  it('can make buckets', () => {
    const assetIds = [ethAssetId]
    const ethBalance = '42069'
    const balances = {
      [ethAssetId]: ethBalance,
    }
    ;(Object.values(HistoryTimeframe) as HistoryTimeframe[]).forEach(timeframe => {
      const bucketsAndMeta = makeBuckets({ assetIds, balances, timeframe })
      expect(bucketsAndMeta.buckets.length).toEqual(timeframeMap[timeframe].count)
      bucketsAndMeta.buckets.forEach(bucket => {
        const { balance } = bucket
        expect(Object.values(balance.fiat).every(v => v.toNumber() === 0)).toBeTruthy()
        expect(Object.keys(balance.crypto)).toEqual(assetIds)
        expect(balance.crypto[ethAssetId]).toEqual(bn(ethBalance))
      })
    })
  })
})

describe('bucketTxs', () => {
  beforeAll(() => {
    jest.useFakeTimers('modern')
    jest.setSystemTime(new Date(mockedDate))
  })

  afterAll(() => jest.useRealTimers())

  it('can bucket txs', () => {
    const transfer = FOXSend.transfers[0]
    const value = transfer.value

    const balances = {
      [foxAssetId]: value,
    }
    const assetIds = [foxAssetId]
    const timeframe = HistoryTimeframe.YEAR
    const buckets = makeBuckets({ assetIds, balances, timeframe })

    const txs = [FOXSend]
    const rebases: RebaseHistory[] = []

    const bucketedTxs = bucketEvents(txs, rebases, buckets)

    const totalTxs = bucketedTxs.reduce<number>((acc, bucket: Bucket) => acc + bucket.txs.length, 0)

    // if this non null assertion is false we fail anyway
    const expectedBucket = bucketedTxs.find(bucket => bucket.txs.length)!
    expect(totalTxs).toEqual(txs.length)
    expect(expectedBucket.txs.length).toEqual(1)
    expect(expectedBucket.start.isBefore(expectedBucket.txs[0].blockTime * 1000)).toBeTruthy()
    expect(expectedBucket.end.isAfter(expectedBucket.txs[0].blockTime * 1000)).toBeTruthy()
  })
})

describe('calculateBucketPrices', () => {
  beforeAll(() => {
    jest.useFakeTimers('modern')
    jest.setSystemTime(new Date(mockedDate))
  })

  afterAll(() => jest.useRealTimers())

  it('has balance of single tx at start of chart, balance of 0 at end of chart', () => {
    const transfer = FOXSend.transfers[0]
    const value = transfer.value

    const balances = {
      [foxAssetId]: '0',
    }
    const assetIds = [foxAssetId]
    const timeframe = HistoryTimeframe.YEAR
    const emptyBuckets = makeBuckets({ assetIds, balances, timeframe })

    const txs = [FOXSend]

    const cryptoPriceHistoryData: PriceHistoryData = {
      [foxAssetId]: [{ price: 0, date: Number() }],
    }
    const fiatPriceHistoryData: HistoryData[] = [{ price: 0, date: Number() }]

    const portfolioAssets: PortfolioAssets = {
      [foxAssetId]: fox,
    }

    const rebases: RebaseHistory[] = []
    const buckets = bucketEvents(txs, rebases, emptyBuckets)

    const calculatedBuckets = calculateBucketPrices({
      assetIds,
      buckets,
      cryptoPriceHistoryData,
      fiatPriceHistoryData,
      portfolioAssets,
    })

    expect(calculatedBuckets[0].balance.crypto[foxAssetId].toFixed(0)).toEqual(value)
    expect(
      calculatedBuckets[calculatedBuckets.length - 1].balance.crypto[foxAssetId].toFixed(0),
    ).toEqual(value)
  })

  it('has zero balance 1 year back', () => {
    const txs = [...ethereumTransactions]
    const balances = {
      [ethAssetId]: '52430152924656054',
    }
    const assetIds = [ethAssetId]
    const timeframe = HistoryTimeframe.YEAR
    const cryptoPriceHistoryData: PriceHistoryData = {
      [ethAssetId]: [{ price: 0, date: Number() }],
    }
    const fiatPriceHistoryData: HistoryData[] = [{ price: 0, date: Number() }]
    const portfolioAssets: PortfolioAssets = {
      [ethAssetId]: ethereum,
    }
    const emptyBuckets = makeBuckets({ assetIds, balances, timeframe })
    const rebases: RebaseHistory[] = []
    const buckets = bucketEvents(txs, rebases, emptyBuckets)

    const calculatedBuckets = calculateBucketPrices({
      assetIds,
      buckets,
      cryptoPriceHistoryData,
      fiatPriceHistoryData,
      portfolioAssets,
    })
    expect(calculatedBuckets[0].balance.crypto[ethAssetId].toNumber()).toEqual(0)
  })
})
