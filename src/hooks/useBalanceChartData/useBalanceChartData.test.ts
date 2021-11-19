import { caip2, caip19 } from '@shapeshiftoss/caip'
import { ChainTypes, ContractTypes, HistoryTimeframe, NetworkTypes } from '@shapeshiftoss/types'
import { TxStatus, TxType } from '@shapeshiftoss/types/dist/chain-adapters'
import { bn } from 'lib/bignumber/bignumber'
import { Tx } from 'state/slices/txHistorySlice/txHistorySlice'

import { caip2FromTx, caip19FromTx, makeBuckets, timeframeMap } from './useBalanceChartData'

const sendERC20Tx: Tx = {
  address: '0x2d44C8B87D0Ec0D19A5249aDccf3BaCc43c5afe6',
  blockHash: '0x8e93bec969f88f472da18a88d68eaac9a4f4b6025a9e4699aedebfa8a08969c4',
  blockHeight: 13011202,
  blockTime: 1628782628,
  confirmations: 629748,
  network: NetworkTypes.MAINNET,
  txid: '0x88d774530e7b7544f86ed25e4c602a15402ac79b9617d30624c4acd3c1034769',
  fee: {
    symbol: 'ETH',
    value: '1625777000000000'
  },
  status: TxStatus.Confirmed,
  asset: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
  value: '4448382624806275089213',
  chainSpecific: {
    token: {
      contract: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
      contractType: ContractTypes.ERC20,
      name: 'FOX',
      precision: 18,
      symbol: 'FOX'
    }
  },
  chain: ChainTypes.Ethereum,
  type: TxType.Send,
  to: '0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d'
}

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
