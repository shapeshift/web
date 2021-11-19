import { caip2, caip19 } from '@shapeshiftoss/caip'
import { ChainTypes, ContractTypes, HistoryTimeframe, NetworkTypes } from '@shapeshiftoss/types'
import { bn } from 'lib/bignumber/bignumber'

import { sendERC20Tx } from './balanceChartTestData'
import { caip2FromTx, caip19FromTx, makeBuckets, timeframeMap } from './useBalanceChartData'

describe('caip2FromTx', () => {
  it('can get correct caip2 from tx', () => {
    const chain = ChainTypes.Ethereum
    const network = NetworkTypes.MAINNET
    const ethCAIP2 = caip2.toCAIP2({ chain, network })
    const sendCAIP2 = caip2FromTx(sendERC20Tx)
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
    const sendAssetCaip19 = caip19FromTx(sendERC20Tx)
    expect(sendAssetCaip19).toEqual(expectedCAIP19)
  })
})

describe('makeBuckets', () => {
  jest.useFakeTimers('modern').setSystemTime(new Date('2021-11-01').getTime())
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
      const buckets = makeBuckets({ assets, balances, timeframe })
      expect(buckets.buckets.length).toEqual(timeframeMap[timeframe].count)
      buckets.buckets.forEach(bucket => {
        const { balance } = bucket
        expect(balance.fiat).toEqual(0)
        expect(Object.keys(balance.crypto)).toEqual(assets)
        expect(balance.crypto[ethCAIP19]).toEqual(bn(ethBalance))
      })
    })
  })
})
