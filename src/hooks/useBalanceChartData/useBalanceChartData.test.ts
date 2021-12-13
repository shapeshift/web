import { ChainTypes, HistoryTimeframe, UtxoAccountType } from '@shapeshiftoss/types'
import { PortfolioAssets } from 'hooks/usePortfolioAssets/usePortfolioAssets'
import { ethereum, fox } from 'jest/mocks/assets'
import { FOXSend, testTxs } from 'jest/mocks/txs'
import { bn } from 'lib/bignumber/bignumber'
import { PriceHistoryData } from 'pages/Assets/hooks/usePriceHistory/usePriceHistory'

import {
  Bucket,
  bucketTxs,
  calculateBucketPrices,
  makeBuckets,
  timeframeMap
} from './useBalanceChartData'

const mockedDate = '2021-11-20T00:00:00Z'

// jest.mock(
//   'dayjs',
//   () =>
//     (...args: any[]) =>
//       jest.requireActual('dayjs')(...(args.filter(arg => arg).length > 0 ? args : [mockedDate]))
// )

const ethCaip2 = 'eip155:1'
const ethCaip19 = 'eip155:1/slip44:60'
const foxCaip19 = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'

describe('makeBuckets', () => {
  it('can make buckets', () => {
    const assets = [ethCaip19]
    const ethBalance = '42069'
    const balances = {
      [ethCaip19]: {
        balance: ethBalance,
        pubkey: '',
        chain: ChainTypes.Ethereum,
        caip2: ethCaip2,
        caip19: ethCaip19,
        chainSpecific: {}
      }
    }
    ;(Object.values(HistoryTimeframe) as Array<HistoryTimeframe>).forEach(timeframe => {
      const bucketsAndMeta = makeBuckets({ assets, balances, timeframe })
      expect(bucketsAndMeta.buckets.length).toEqual(timeframeMap[timeframe].count)
      bucketsAndMeta.buckets.forEach(bucket => {
        const { balance } = bucket
        expect(balance.fiat.toNumber()).toEqual(0)
        expect(Object.keys(balance.crypto)).toEqual(assets)
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
      [foxCaip19]: {
        balance: value,
        pubkey: '',
        symbol: 'FOX',
        caip2: ethCaip2,
        caip19: foxCaip19,
        chain: ChainTypes.Ethereum,
        chainSpecific: {}
      }
    }
    const assets = [foxCaip19]
    const timeframe = HistoryTimeframe.YEAR
    const buckets = makeBuckets({ assets, balances, timeframe })

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
      [foxCaip19]: {
        balance: '0',
        pubkey: '',
        caip2: ethCaip2,
        caip19: foxCaip19,
        chain: ChainTypes.Ethereum,
        chainSpecific: {}
      }
    }
    const assets = [foxCaip19]
    const timeframe = HistoryTimeframe.YEAR
    const emptyBuckets = makeBuckets({ assets, balances, timeframe })

    const txs = [FOXSend]

    const priceHistoryData: PriceHistoryData = {
      [foxCaip19]: [{ price: 0, date: String() }]
    }

    const portfolioAssets: PortfolioAssets = {
      [foxCaip19]: fox
    }

    const buckets = bucketTxs(txs, emptyBuckets)
    const accountTypes = {
      [ChainTypes.Bitcoin]: UtxoAccountType.SegwitNative
    }

    const calculatedBuckets = calculateBucketPrices({
      accountTypes,
      assets,
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
      [ethCaip19]: {
        balance: '52430152924656054',
        pubkey: '',
        caip2: ethCaip2,
        caip19: ethCaip19,
        chain: ChainTypes.Ethereum,
        chainSpecific: {}
      }
    }
    const assets = [ethCaip19]
    const timeframe = HistoryTimeframe.YEAR
    const priceHistoryData: PriceHistoryData = {
      [ethCaip19]: [{ price: 0, date: String() }]
    }
    const portfolioAssets: PortfolioAssets = {
      [ethCaip19]: ethereum
    }

    const emptyBuckets = makeBuckets({ assets, balances, timeframe })
    const buckets = bucketTxs(txs, emptyBuckets)

    const accountTypes = {
      [ChainTypes.Bitcoin]: UtxoAccountType.SegwitNative
    }

    const calculatedBuckets = calculateBucketPrices({
      accountTypes,
      assets,
      buckets,
      priceHistoryData,
      portfolioAssets
    })
    expect(calculatedBuckets[0].balance.crypto[ethCaip19].toNumber()).toEqual(0)
  })
})
