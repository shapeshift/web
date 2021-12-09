import { ChainTypes, HistoryTimeframe, NetworkTypes, UtxoAccountType } from '@shapeshiftoss/types'
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

describe('makeBuckets', () => {
  it('can make buckets', () => {
    const ethCAIP19 = 'eip155:1/slip44:60'
    const assets = [ethCAIP19]
    const ethBalance = '42069'
    const balances = {
      [ethCAIP19]: {
        balance: ethBalance,
        pubkey: '',
        symbol: 'ETH',
        chain: ChainTypes.Ethereum,
        network: NetworkTypes.MAINNET,
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
        expect(balance.crypto[ethCAIP19]).toEqual(bn(ethBalance))
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
    const FOXCAIP19 = transfer.caip19
    const value = transfer.value

    const balances = {
      [FOXCAIP19]: {
        balance: value,
        pubkey: '',
        symbol: 'FOX',
        chain: ChainTypes.Ethereum,
        network: NetworkTypes.MAINNET,
        chainSpecific: {}
      }
    }
    const assets = [FOXCAIP19]
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
    const FOXCAIP19 = transfer.caip19
    const value = transfer.value

    const balances = {
      [FOXCAIP19]: {
        balance: '0',
        pubkey: '',
        symbol: 'FOX',
        chain: ChainTypes.Ethereum,
        network: NetworkTypes.MAINNET,
        chainSpecific: {}
      }
    }
    const assets = [FOXCAIP19]
    const timeframe = HistoryTimeframe.YEAR
    const emptyBuckets = makeBuckets({ assets, balances, timeframe })

    const txs = [FOXSend]

    const priceHistoryData: PriceHistoryData = {
      [FOXCAIP19]: [{ price: 0, date: String() }]
    }

    const portfolioAssets: PortfolioAssets = {
      [FOXCAIP19]: fox
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

    expect(calculatedBuckets[0].balance.crypto[FOXCAIP19].toFixed(0)).toEqual(value)
    expect(
      calculatedBuckets[calculatedBuckets.length - 1].balance.crypto[FOXCAIP19].toFixed(0)
    ).toEqual(value)
  })

  it('has zero balance 1 year back', () => {
    const txs = testTxs
    const ETHCAIP19 = txs[0].transfers[0].caip19
    const balances = {
      [ETHCAIP19]: {
        balance: '52430152924656054',
        pubkey: '',
        symbol: 'ETH',
        chain: ChainTypes.Ethereum,
        network: NetworkTypes.MAINNET,
        chainSpecific: {}
      }
    }
    const assets = [ETHCAIP19]
    const timeframe = HistoryTimeframe.YEAR
    const priceHistoryData: PriceHistoryData = {
      [ETHCAIP19]: [{ price: 0, date: String() }]
    }
    const portfolioAssets: PortfolioAssets = {
      [ETHCAIP19]: ethereum
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
    expect(calculatedBuckets[0].balance.crypto[ETHCAIP19].toNumber()).toEqual(0)
  })
})
