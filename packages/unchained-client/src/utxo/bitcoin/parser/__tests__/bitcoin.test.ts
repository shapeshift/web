import { btcAssetId, btcChainId } from '@shapeshiftoss/caip'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Trade } from '../../../../types'
import { Dex, TradeType, TransferType, TxStatus } from '../../../../types'
import type { ParsedTx } from '../../../parser'
import { TransactionParser } from '../index'
import standardNoChange from './mockData/standardNoChange'
import standardWithChange from './mockData/standardWithChange'
import thorchainLoanOpen from './mockData/thorchainLoanOpen'
import thorchainLoanOpenOutbound from './mockData/thorchainLoanOpenOutbound'
import thorchainLoanOpenRefund from './mockData/thorchainLoanOpenRefund'
import thorchainLoanRepayment from './mockData/thorchainLoanRepayment'
import thorchainLoanRepaymentOutbound from './mockData/thorchainLoanRepaymentOutbound'
import thorchainLoanRepaymentRefund from './mockData/thorchainLoanRepaymentRefund'
import thorchainLpDeposit from './mockData/thorchainLpDeposit'
import thorchainLpOutbound from './mockData/thorchainLpOutbound'
import thorchainLpRefund from './mockData/thorchainLpRefund'
import thorchainLpWithdraw from './mockData/thorchainLpWithdraw'
import thorchainSaversDeposit from './mockData/thorchainSaversDeposit'
import thorchainSaversOutbound from './mockData/thorchainSaversOutbound'
import thorchainSaversRefund from './mockData/thorchainSaversRefund'
import thorchainSaversWithdraw from './mockData/thorchainSaversWithdraw'
import thorchainStreamingSwap from './mockData/thorchainStreamingSwap'
import thorchainStreamingSwapOutbound from './mockData/thorchainStreamingSwapOutbound'
import thorchainStreamingSwapRefund from './mockData/thorchainStreamingSwapRefund'
import thorchainSwap from './mockData/thorchainSwap'
import thorchainSwapOutbound from './mockData/thorchainSwapOutbound'
import thorchainSwapRefund from './mockData/thorchainSwapRefund'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
}))

vi.mock('axios', () => {
  const mockAxios = {
    create: vi.fn(() => ({
      get: mocks.get,
    })),
  }

  return {
    default: mockAxios,
  }
})

const txParser = new TransactionParser({
  chainId: btcChainId,
  assetId: btcAssetId,
  thorMidgardUrl: '',
  mayaMidgardUrl: '',
})

describe('parseTx', () => {
  beforeEach(() => {
    mocks.get.mockReset()
  })

  describe('standard', () => {
    it('should be able to parse standard send with no change mempool', async () => {
      const { txMempool } = standardNoChange
      const address = '1ALpDTSP3BmBYKDudG8sLmt9ppDRNwqunj'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        address,
        chainId: btcChainId,
        fee: {
          assetId: btcAssetId,
          value: '6528',
        },
        transfers: [
          {
            type: TransferType.Send,
            from: '1ALpDTSP3BmBYKDudG8sLmt9ppDRNwqunj',
            to: '1KcXirKZg5bNnwAKGCTDprwJXivtFyAQc7',
            assetId: btcAssetId,
            totalValue: '12989718',
            components: [{ value: '12989718' }],
          },
        ],
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse standard send with no change', async () => {
      const { tx } = standardNoChange
      const address = '1ALpDTSP3BmBYKDudG8sLmt9ppDRNwqunj'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: btcChainId,
        fee: {
          assetId: btcAssetId,
          value: '6528',
        },
        transfers: [
          {
            type: TransferType.Send,
            from: '1ALpDTSP3BmBYKDudG8sLmt9ppDRNwqunj',
            to: '1KcXirKZg5bNnwAKGCTDprwJXivtFyAQc7',
            assetId: btcAssetId,
            totalValue: '12989718',
            components: [{ value: '12989718' }],
          },
        ],
      }

      const actual = await txParser.parse(tx, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse standard receive no change mempool', async () => {
      const { txMempool } = standardNoChange
      const address = '1KcXirKZg5bNnwAKGCTDprwJXivtFyAQc7'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        address,
        chainId: btcChainId,
        transfers: [
          {
            type: TransferType.Receive,
            to: '1KcXirKZg5bNnwAKGCTDprwJXivtFyAQc7',
            from: '1ALpDTSP3BmBYKDudG8sLmt9ppDRNwqunj',
            assetId: btcAssetId,
            totalValue: '12983190',
            components: [{ value: '12983190' }],
          },
        ],
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse standard receive no change', async () => {
      const { tx } = standardNoChange
      const address = '1KcXirKZg5bNnwAKGCTDprwJXivtFyAQc7'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: btcChainId,
        transfers: [
          {
            type: TransferType.Receive,
            to: '1KcXirKZg5bNnwAKGCTDprwJXivtFyAQc7',
            from: '1ALpDTSP3BmBYKDudG8sLmt9ppDRNwqunj',
            assetId: btcAssetId,
            totalValue: '12983190',
            components: [{ value: '12983190' }],
          },
        ],
      }

      const actual = await txParser.parse(tx, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse standard send with change mempool', async () => {
      const { txMempool } = standardWithChange
      const address = '19BJg2jSvz8pHiz7kKSgdp69iVV5CnAvzB'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        address,
        chainId: btcChainId,
        fee: {
          assetId: btcAssetId,
          value: '6112',
        },
        transfers: [
          {
            type: TransferType.Send,
            to: '1Ex6unDe3gt4twj8GDHTutUbKvvHzMPj3e',
            from: '19BJg2jSvz8pHiz7kKSgdp69iVV5CnAvzB',
            assetId: btcAssetId,
            totalValue: '4098889',
            components: [{ value: '4098889' }],
          },
          {
            type: TransferType.Receive,
            to: '19BJg2jSvz8pHiz7kKSgdp69iVV5CnAvzB',
            from: '19BJg2jSvz8pHiz7kKSgdp69iVV5CnAvzB',
            assetId: btcAssetId,
            totalValue: '3908177',
            components: [{ value: '3908177' }],
          },
        ],
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse standard send with change', async () => {
      const { tx } = standardWithChange
      const address = '19BJg2jSvz8pHiz7kKSgdp69iVV5CnAvzB'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: btcChainId,
        fee: {
          assetId: btcAssetId,
          value: '6112',
        },
        transfers: [
          {
            type: TransferType.Send,
            to: '1Ex6unDe3gt4twj8GDHTutUbKvvHzMPj3e',
            from: '19BJg2jSvz8pHiz7kKSgdp69iVV5CnAvzB',
            assetId: btcAssetId,
            totalValue: '4098889',
            components: [{ value: '4098889' }],
          },
          {
            type: TransferType.Receive,
            to: '19BJg2jSvz8pHiz7kKSgdp69iVV5CnAvzB',
            from: '19BJg2jSvz8pHiz7kKSgdp69iVV5CnAvzB',
            assetId: btcAssetId,
            totalValue: '3908177',
            components: [{ value: '3908177' }],
          },
        ],
      }

      const actual = await txParser.parse(tx, address)

      expect(expected).toEqual(actual)
    })
  })

  describe('thorchain', () => {
    it('should be able to parse swap', async () => {
      const { tx } = thorchainSwap
      const address = 'bc1qhj86s3evc2y9wawecemntq8sp0c3mqmaagmqjd'
      const memo = '=:GAIA.ATOM:cosmos1aywmluxanawepu2g2vpe3a449ashlxy04l2mcc:37207e5:rg:25'

      mocks.get.mockImplementation(() => ({ data: { actions: [{}] } }))

      const trade: Trade = {
        dexName: Dex.Thor,
        memo,
        type: TradeType.Swap,
      }

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: btcChainId,
        fee: {
          assetId: btcAssetId,
          value: '40128',
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: 'bc1qgpa0uz3ph4076j4f3kjxgzzd6t5298sdtjvwc9',
            assetId: btcAssetId,
            totalValue: '881809',
            components: [{ value: '161139' }, { value: '720670' }],
          },
          {
            type: TransferType.Receive,
            from: address,
            to: address,
            assetId: btcAssetId,
            totalValue: '59872',
            components: [{ value: '59872' }],
          },
        ],
        data: {
          parser: 'thorchain',
          memo,
          method: 'swap',
          swap: { type: 'Standard' },
        },
        trade,
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse swap outbound', async () => {
      const { tx, actionsResponse } = thorchainSwapOutbound
      const address = 'bc1qtgsttdcy3z67hegc36l99egdm36va0m5r0gece'
      const memo = 'OUT:B5FE4F2D310D32ADD3D70C1E806E224943A08E73AC89287AB374B6566C4605D8'

      mocks.get.mockImplementation(() => ({ data: actionsResponse }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: btcChainId,
        transfers: [
          {
            type: TransferType.Receive,
            from: 'bc1qh7cjvuc3gtt3r4afm0zqvhvrpkfw0ahxrfwfgu',
            to: address,
            assetId: btcAssetId,
            totalValue: '24574773',
            components: [{ value: '24574773' }],
          },
        ],
        data: {
          parser: 'thorchain',
          memo,
          originMemo: actionsResponse.actions[0].metadata?.swap?.memo,
          method: 'swapOut',
          swap: { type: 'Standard' },
        },
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse swap refund', async () => {
      const { tx, actionsResponse } = thorchainSwapRefund
      const address = 'bc1qss42t2tk76cst7267xj4jsuddqea69zgdkql89'
      const memo = 'REFUND:1A15D2C488FCA6FE4B50A930BDFCF320DAD6FCFF629B8D91310648E35FCEE967'

      mocks.get.mockImplementation(() => ({ data: actionsResponse }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: btcChainId,
        transfers: [
          {
            type: TransferType.Receive,
            from: 'bc1qgpa0uz3ph4076j4f3kjxgzzd6t5298sdtjvwc9',
            to: address,
            assetId: btcAssetId,
            totalValue: '2943300',
            components: [{ value: '2943300' }],
          },
        ],
        data: {
          parser: 'thorchain',
          memo,
          originMemo: actionsResponse.actions[1].metadata?.refund?.memo,
          method: 'swapRefund',
          swap: { type: 'Standard' },
        },
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse streaming swap', async () => {
      const { tx } = thorchainStreamingSwap
      const address = 'bc1q0aajfmjr9a007zadm60lusdl2lqtexars8aul3'
      const memo = '=:ETH.USDT-EC7:0x6057d2D9f07e06FA0836a17a4e4F0044d8F02912:0/1/0:ti:70'

      mocks.get.mockImplementation(() => ({ data: { actions: [{}] } }))

      const trade: Trade = {
        dexName: Dex.Thor,
        memo,
        type: TradeType.Swap,
      }

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: btcChainId,
        fee: {
          assetId: btcAssetId,
          value: '11484',
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: 'bc1qgpa0uz3ph4076j4f3kjxgzzd6t5298sdtjvwc9',
            assetId: btcAssetId,
            totalValue: '689420',
            components: [{ value: '689420' }],
          },
          {
            type: TransferType.Receive,
            from: address,
            to: address,
            assetId: btcAssetId,
            totalValue: '469636',
            components: [{ value: '469636' }],
          },
        ],
        data: {
          parser: 'thorchain',
          memo,
          method: 'swap',
          swap: { type: 'Streaming' },
        },
        trade,
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse streaming swap outbound', async () => {
      const { tx, actionsResponse } = thorchainStreamingSwapOutbound
      const address = 'bc1qk8mhj9j5rsz7j7ymv92t2mv5fcqfgt7scn9p72'
      const memo = 'OUT:08A863D310AECF008B4A9742A596603EA008C682B4E48FF8FF80C408FBE72EB3'

      mocks.get.mockImplementation(() => ({ data: actionsResponse }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: btcChainId,
        transfers: [
          {
            type: TransferType.Receive,
            from: 'bc1qsqwywyfq3dhrmu3kh8emh2l6u5hde7szxpg99j',
            to: address,
            assetId: btcAssetId,
            totalValue: '116388',
            components: [{ value: '116388' }],
          },
        ],
        data: {
          parser: 'thorchain',
          memo,
          originMemo: actionsResponse.actions[0].metadata?.swap?.memo,
          method: 'swapOut',
          swap: { type: 'Streaming' },
        },
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse streaming swap refund', async () => {
      const { tx, actionsResponse } = thorchainStreamingSwapRefund
      const address = 'bc1qafsug8uvhxga5ua9q99k46nhd680e97n26egzc'
      const memo = 'REFUND:08933D25AD065A6C96E60BA2A0E5DED23810E8A303D3E06192BD9393149D5002'

      mocks.get.mockImplementation(() => ({ data: actionsResponse }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: btcChainId,
        transfers: [
          {
            type: TransferType.Receive,
            from: 'bc1qyl7wjm2ldfezgnjk2c78adqlk7dvtm8sd7gn0q',
            to: address,
            assetId: btcAssetId,
            totalValue: '117553237',
            components: [{ value: '117553237' }],
          },
        ],
        data: {
          parser: 'thorchain',
          memo,
          originMemo: actionsResponse.actions[0].metadata?.refund?.memo,
          method: 'swapRefund',
          swap: { type: 'Streaming' },
        },
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse savers deposit', async () => {
      const { tx } = thorchainSaversDeposit
      const address = 'bc1qqfcte3j9jgaa7p3uxr6fntqpad269vv2wvmzss'
      const memo = '+:BTC/BTC::t:0'

      mocks.get.mockImplementation(() => ({ data: { actions: [{}] } }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: btcChainId,
        fee: {
          assetId: btcAssetId,
          value: '26058',
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: 'bc1qyl7wjm2ldfezgnjk2c78adqlk7dvtm8sd7gn0q',
            assetId: btcAssetId,
            totalValue: '17494111',
            components: [{ value: '17494111' }],
          },
        ],
        data: {
          parser: 'thorchain',
          method: 'deposit',
          memo,
          liquidity: { type: 'Savers' },
        },
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse savers withdraw', async () => {
      const { tx } = thorchainSaversWithdraw
      const address = 'bc1quneer6jgruq5ltatkjcl3rq75u0pzzlnrfkj5j'
      const memo = '-:BTC/BTC:10000'

      mocks.get.mockImplementation(() => ({ data: { actions: [{}] } }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: btcChainId,
        fee: {
          assetId: btcAssetId,
          value: '17640',
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: 'bc1qgpa0uz3ph4076j4f3kjxgzzd6t5298sdtjvwc9',
            assetId: btcAssetId,
            totalValue: '371369',
            components: [{ value: '371369' }],
          },
          {
            type: TransferType.Receive,
            from: address,
            to: address,
            assetId: btcAssetId,
            totalValue: '343728',
            components: [{ value: '343728' }],
          },
        ],
        data: {
          parser: 'thorchain',
          method: 'withdraw',
          memo,
          liquidity: { type: 'Savers' },
        },
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse savers outbound', async () => {
      const { tx, actionsResponse } = thorchainSaversOutbound
      const address = 'bc1qgc62l320e29qg3cadhxn65kldp308n6epn07ej'
      const memo = 'OUT:67F019E338BE8682A7D2C988277B8F32FC197F429CC43AA9B195C14F9597741E'

      mocks.get.mockImplementation(() => ({ data: actionsResponse }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: btcChainId,
        transfers: [
          {
            type: TransferType.Receive,
            from: 'bc1qsqwywyfq3dhrmu3kh8emh2l6u5hde7szxpg99j',
            to: address,
            assetId: btcAssetId,
            totalValue: '1166419',
            components: [{ value: '1166419' }],
          },
        ],
        data: {
          parser: 'thorchain',
          memo,
          originMemo: actionsResponse.actions[1].metadata?.withdraw?.memo,
          method: 'withdrawOut',
          liquidity: { type: 'Savers' },
        },
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse savers refund', async () => {
      const { tx, actionsResponse } = thorchainSaversRefund
      const address = 'bc1qw400vxxng36x052q8gthtvm3ujnl5xz957p2ma'
      const memo = 'REFUND:B25446E18F1B3A8D03708EAB1636C4B35E218AF05BE3FD8A811D39953CBF909A'

      mocks.get.mockImplementation(() => ({ data: actionsResponse }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: btcChainId,
        transfers: [
          {
            type: TransferType.Receive,
            from: 'bc1qyl7wjm2ldfezgnjk2c78adqlk7dvtm8sd7gn0q',
            to: address,
            assetId: btcAssetId,
            totalValue: '1132183',
            components: [{ value: '1132183' }],
          },
        ],
        data: {
          parser: 'thorchain',
          memo,
          originMemo: actionsResponse.actions[0].metadata?.refund?.memo,
          method: 'depositRefund',
          liquidity: { type: 'Savers' },
        },
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse lp deposit', async () => {
      const { tx } = thorchainLpDeposit
      const address = 'bc1qn72fnd27rfk33jx6pmglnl6x2e07c8cxnahrgj'
      const memo = '+:BTC.BTC::t:0'

      mocks.get.mockImplementation(() => ({ data: { actions: [{}] } }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: btcChainId,
        fee: {
          assetId: btcAssetId,
          value: '35250',
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: 'bc1qyl7wjm2ldfezgnjk2c78adqlk7dvtm8sd7gn0q',
            assetId: btcAssetId,
            totalValue: '90800000',
            components: [{ value: '80800000' }, { value: '10000000' }],
          },
          {
            type: TransferType.Receive,
            from: address,
            to: address,
            assetId: btcAssetId,
            totalValue: '764750',
            components: [{ value: '764750' }],
          },
        ],
        data: {
          parser: 'thorchain',
          method: 'deposit',
          memo,
          liquidity: { type: 'LP' },
        },
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse lp withdraw', async () => {
      const { tx } = thorchainLpWithdraw
      const address = 'bc1q9sqrn9gyjqjuds7gf66nwm6vr54eyfqdj86qxd'
      const memo = '-:BTC.BTC:10000'

      mocks.get.mockImplementation(() => ({ data: { actions: [{}] } }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: btcChainId,
        fee: {
          assetId: btcAssetId,
          value: '17640',
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: 'bc1qgpa0uz3ph4076j4f3kjxgzzd6t5298sdtjvwc9',
            assetId: btcAssetId,
            totalValue: '2000000',
            components: [{ value: '2000000' }],
          },
          {
            type: TransferType.Receive,
            from: address,
            to: address,
            assetId: btcAssetId,
            totalValue: '1972359',
            components: [{ value: '1972359' }],
          },
        ],
        data: {
          parser: 'thorchain',
          method: 'withdraw',
          memo,
          liquidity: { type: 'LP' },
        },
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse lp outbound', async () => {
      const { tx, actionsResponse } = thorchainLpOutbound
      const address = 'bc1qpaue8hq4zcyzsys02pr0yxr60s6hsz6yt6h493'
      const memo = 'OUT:85CEF3183958A805643C6BD93169AC2ED30051C21F19CBF5B26161CC5AF89659'

      mocks.get.mockImplementation(() => ({ data: actionsResponse }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: btcChainId,
        transfers: [
          {
            type: TransferType.Receive,
            from: 'bc1qsqwywyfq3dhrmu3kh8emh2l6u5hde7szxpg99j',
            to: address,
            assetId: btcAssetId,
            totalValue: '914306',
            components: [{ value: '914306' }],
          },
        ],
        data: {
          parser: 'thorchain',
          memo,
          originMemo: actionsResponse.actions[0].metadata?.withdraw?.memo,
          method: 'withdrawOut',
          liquidity: { type: 'LP' },
        },
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse lp refund', async () => {
      const { tx, actionsResponse } = thorchainLpRefund
      const address = 'bc1qw400vxxng36x052q8gthtvm3ujnl5xz957p2ma'
      const memo = 'REFUND:B25446E18F1B3A8D03708EAB1636C4B35E218AF05BE3FD8A811D39953CBF909A'

      mocks.get.mockImplementation(() => ({ data: actionsResponse }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: btcChainId,
        transfers: [
          {
            type: TransferType.Receive,
            from: 'bc1qyl7wjm2ldfezgnjk2c78adqlk7dvtm8sd7gn0q',
            to: address,
            assetId: btcAssetId,
            totalValue: '1132183',
            components: [{ value: '1132183' }],
          },
        ],
        data: {
          parser: 'thorchain',
          memo,
          originMemo: actionsResponse.actions[0].metadata?.refund?.memo,
          method: 'depositRefund',
          liquidity: { type: 'LP' },
        },
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse loan open', async () => {
      const { tx } = thorchainLoanOpen
      const address = 'bc1qdvzzsscn056p6k0xe0y05ray32g8a5pzs74qra'
      const memo = '$+:THOR.RUNE:thor1h7jfggcpqvc4dz546wm9etlgsas0x6su3q490w'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: btcChainId,
        fee: {
          assetId: btcAssetId,
          value: '15822',
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: 'bc1qh7cjvuc3gtt3r4afm0zqvhvrpkfw0ahxrfwfgu',
            assetId: btcAssetId,
            totalValue: '5300894',
            components: [{ value: '5300894' }],
          },
          {
            type: TransferType.Receive,
            from: address,
            to: address,
            assetId: btcAssetId,
            totalValue: '65072',
            components: [{ value: '65072' }],
          },
        ],
        data: { parser: 'thorchain', method: 'loanOpen', memo },
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse loan open outbound', async () => {
      const { tx, actionsResponse } = thorchainLoanOpenOutbound
      const address = 'bc1qey0whgq0ef4rxdm2pv63fxrzykpnk8weucpux5'
      const memo = 'OUT:84D4507377BAE8F7B9297EAE39738854459C8C375D1994BB9AF36E451232C5F5'

      mocks.get.mockImplementation(() => ({ data: actionsResponse }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: btcChainId,
        transfers: [
          {
            type: TransferType.Receive,
            from: 'bc1qnrum37mdlvtay95k5f8hxyk8sy6rvvy60vc9gq',
            to: address,
            assetId: btcAssetId,
            totalValue: '1762711',
            components: [{ value: '1762711' }],
          },
        ],
        data: {
          parser: 'thorchain',
          memo,
          originMemo: actionsResponse.actions[0].metadata?.swap?.memo,
          method: 'loanOpenOut',
        },
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse loan repayment', async () => {
      const { tx } = thorchainLoanRepayment
      const address = 'bc1q3a2me0crkm0ap27ythdavfa20l2tgw3cs4tf4k'
      const memo = '$-:BTC.BTC:bc1q3a2me0crkm0ap27ythdavfa20l2tgw3cs4tf4k'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: btcChainId,
        fee: {
          assetId: btcAssetId,
          value: '19140',
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: 'bc1qh7cjvuc3gtt3r4afm0zqvhvrpkfw0ahxrfwfgu',
            assetId: btcAssetId,
            totalValue: '20222437',
            components: [{ value: '20222437' }],
          },
          {
            type: TransferType.Receive,
            from: address,
            to: address,
            assetId: btcAssetId,
            totalValue: '2530623',
            components: [{ value: '2530623' }],
          },
        ],
        data: { parser: 'thorchain', method: 'loanRepayment', memo },
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse loan repayment outbound', async () => {
      const { tx, actionsResponse } = thorchainLoanRepaymentOutbound
      const address = 'bc1q269j5rs4rm5tjpvm6adcchhvgmghc4p46250ra'
      const memo = 'OUT:5378E62D1426BA399753583F01E8655C508DE22903352D1CAFA10942222CF7A1'

      mocks.get.mockImplementation(() => ({ data: actionsResponse }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: btcChainId,
        transfers: [
          {
            type: TransferType.Receive,
            from: 'bc1qh7cjvuc3gtt3r4afm0zqvhvrpkfw0ahxrfwfgu',
            to: address,
            assetId: btcAssetId,
            totalValue: '14954979',
            components: [{ value: '14954979' }],
          },
        ],
        data: {
          parser: 'thorchain',
          memo,
          originMemo: actionsResponse.actions[0].metadata?.swap?.memo,
          method: 'loanRepaymentOut',
        },
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse loan open refund', async () => {
      const { tx, actionsResponse } = thorchainLoanOpenRefund
      const address = 'bc1q269j5rs4rm5tjpvm6adcchhvgmghc4p46250ra'
      const memo = 'REFUND:5378E62D1426BA399753583F01E8655C508DE22903352D1CAFA10942222CF7A1'

      mocks.get.mockImplementation(() => ({ data: actionsResponse }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: btcChainId,
        transfers: [
          {
            type: TransferType.Receive,
            from: 'bc1qh7cjvuc3gtt3r4afm0zqvhvrpkfw0ahxrfwfgu',
            to: address,
            assetId: btcAssetId,
            totalValue: '14954979',
            components: [{ value: '14954979' }],
          },
        ],
        data: {
          parser: 'thorchain',
          method: 'loanOpenRefund',
          memo,
          originMemo: actionsResponse.actions[0].metadata?.refund?.memo,
        },
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse loan repayment refund', async () => {
      const { tx, actionsResponse } = thorchainLoanRepaymentRefund
      const address = 'bc1q269j5rs4rm5tjpvm6adcchhvgmghc4p46250ra'
      const memo = 'REFUND:5378E62D1426BA399753583F01E8655C508DE22903352D1CAFA10942222CF7A1'

      mocks.get.mockImplementation(() => ({ data: actionsResponse }))

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: btcChainId,
        transfers: [
          {
            type: TransferType.Receive,
            from: 'bc1qh7cjvuc3gtt3r4afm0zqvhvrpkfw0ahxrfwfgu',
            to: address,
            assetId: btcAssetId,
            totalValue: '14954979',
            components: [{ value: '14954979' }],
          },
        ],
        data: {
          parser: 'thorchain',
          method: 'loanRepaymentRefund',
          memo,
          originMemo: actionsResponse.actions[0].metadata?.refund?.memo,
        },
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })
  })
})
