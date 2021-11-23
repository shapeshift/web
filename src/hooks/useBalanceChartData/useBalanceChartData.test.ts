import { caip2, caip19 } from '@shapeshiftoss/caip'
import {
  ChainTypes,
  ContractTypes,
  HistoryTimeframe,
  NetworkTypes,
  UtxoAccountType
} from '@shapeshiftoss/types'
import { PortfolioAssets } from 'hooks/usePortfolioAssets/usePortfolioAssets'
import { ethereum, fox } from 'jest/mocks/assets'
import { FOXSend, testTxs } from 'jest/mocks/txs'
import { bn } from 'lib/bignumber/bignumber'
import { PriceHistoryData } from 'pages/Assets/hooks/usePriceHistory/usePriceHistory'

import {
  Bucket,
  bucketTxs,
  caip2FromTx,
  caip19FromTx,
  calculateBucketPrices,
  makeBuckets,
  timeframeMap
} from './useBalanceChartData'

const mockedDate = '2021-11-20T00:00:00Z'

jest.mock(
  'dayjs',
  () =>
    (...args: any[]) =>
      jest.requireActual('dayjs')(...(args.filter(arg => arg).length > 0 ? args : [mockedDate]))
)

describe('caip2FromTx', () => {
  it('can get correct caip2 from tx', () => {
    const chain = ChainTypes.Ethereum
    const network = NetworkTypes.MAINNET
    const ethCAIP2 = caip2.toCAIP2({ chain, network })
    const sendCAIP2 = caip2FromTx(FOXSend)
    expect(sendCAIP2).toEqual(ethCAIP2)
  })
})

describe('caip19FromTx', () => {
  it('can get correct caip19 from send tx', () => {
    const chain = ChainTypes.Ethereum
    const network = NetworkTypes.MAINNET
    const contractType = ContractTypes.ERC20
    const tokenId = '0xc770eefad204b5180df6a14ee197d99d808ee52d'
    const expectedCAIP19 = caip19.toCAIP19({ chain, network, contractType, tokenId })
    const sendAssetCaip19 = caip19FromTx(FOXSend)
    expect(sendAssetCaip19).toEqual(expectedCAIP19)
  })
})

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
  it('can bucket txs', () => {
    const value = FOXSend.value
    const FOXCAIP19 = caip19FromTx(FOXSend)
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

    const expectedBucket = bucketedTxs[346]
    expect(totalTxs).toEqual(txs.length)
    expect(expectedBucket.txs.length).toEqual(1)
    expect(expectedBucket.start.isBefore(expectedBucket.txs[0].blockTime * 1000)).toBeTruthy()
    expect(expectedBucket.end.isAfter(expectedBucket.txs[0].blockTime * 1000)).toBeTruthy()
  })
})

describe('calculateBucketPrices', () => {
  it('has balance of single tx at start of chart, balance of 0 at end of chart', () => {
    const FOXCAIP19 = caip19FromTx(FOXSend)
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

    const value = FOXSend.value
    expect(calculatedBuckets[0].balance.crypto[FOXCAIP19].toFixed(0)).toEqual(value)
    expect(
      calculatedBuckets[calculatedBuckets.length - 1].balance.crypto[FOXCAIP19].toFixed(0)
    ).toEqual(FOXSend.value)
  })

  it('has zero balance 1 year back', () => {
    const txs = testTxs
    const ETHCAIP19 = caip19FromTx(txs[0])
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
