import { HistoryTimeframe } from '@shapeshiftoss/types'
import { ethereum, fox } from 'test/mocks/assets'
import { FOXSend, testTxs } from 'test/mocks/txs'
import { bn } from 'lib/bignumber/bignumber'
import { PriceHistoryData } from 'state/slices/marketDataSlice/marketDataSlice'
import { PortfolioAssets } from 'state/slices/portfolioSlice/portfolioSlice'

import {
  Bucket,
  bucketTxs,
  calculateBucketPrices,
  makeBuckets,
  timeframeMap
} from './useBalanceChartData'

const mockedDate = '2021-11-20T00:00:00Z'

const ethCaip19 = 'eip155:1/slip44:60'
const foxCaip19 = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'

describe('makeBuckets', () => {
  it('can make buckets', () => {
    const assetIds = [ethCaip19]
    const ethBalance = '42069'
    const balances = {
      [ethCaip19]: ethBalance
    }
    ;(Object.values(HistoryTimeframe) as Array<HistoryTimeframe>).forEach(timeframe => {
      const bucketsAndMeta = makeBuckets({ assetIds, balances, timeframe })
      expect(bucketsAndMeta.buckets.length).toEqual(timeframeMap[timeframe].count)
      bucketsAndMeta.buckets.forEach(bucket => {
        const { balance } = bucket
        expect(balance.fiat.toNumber()).toEqual(0)
        expect(Object.keys(balance.crypto)).toEqual(assetIds)
        expect(balance.crypto[ethCaip19]).toEqual(bn(ethBalance))
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
      [foxCaip19]: value
    }
    const assetIds = [foxCaip19]
    const timeframe = HistoryTimeframe.YEAR
    const buckets = makeBuckets({ assetIds, balances, timeframe })

    const txs = [FOXSend]

    const bucketedTxs = bucketTxs(txs, buckets)

    const totalTxs = bucketedTxs.reduce<number>(
      (acc, bucket: Bucket) => (acc += bucket.txs.length),
      0
    )

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
      [foxCaip19]: '0'
    }
    const assetIds = [foxCaip19]
    const timeframe = HistoryTimeframe.YEAR
    const emptyBuckets = makeBuckets({ assetIds, balances, timeframe })

    const txs = [FOXSend]

    const priceHistoryData: PriceHistoryData = {
      [foxCaip19]: [{ price: 0, date: String() }]
    }

    const portfolioAssets: PortfolioAssets = {
      [foxCaip19]: fox
    }

    const buckets = bucketTxs(txs, emptyBuckets)

    const calculatedBuckets = calculateBucketPrices({
      assetIds,
      buckets,
      priceHistoryData,
      portfolioAssets
    })

    expect(calculatedBuckets[0].balance.crypto[foxCaip19].toFixed(0)).toEqual(value)
    expect(
      calculatedBuckets[calculatedBuckets.length - 1].balance.crypto[foxCaip19].toFixed(0)
    ).toEqual(value)
  })

  it('has zero balance 1 year back', () => {
    const txs = testTxs
    const balances = {
      [ethCaip19]: '52430152924656054'
    }
    const assetIds = [ethCaip19]
    const timeframe = HistoryTimeframe.YEAR
    const priceHistoryData: PriceHistoryData = {
      [ethCaip19]: [{ price: 0, date: String() }]
    }
    const portfolioAssets: PortfolioAssets = {
      [ethCaip19]: ethereum
    }

    const emptyBuckets = makeBuckets({ assetIds, balances, timeframe })
    const buckets = bucketTxs(txs, emptyBuckets)

    const calculatedBuckets = calculateBucketPrices({
      assetIds,
      buckets,
      priceHistoryData,
      portfolioAssets
    })
    expect(calculatedBuckets[0].balance.crypto[ethCaip19].toNumber()).toEqual(0)
  })
})
