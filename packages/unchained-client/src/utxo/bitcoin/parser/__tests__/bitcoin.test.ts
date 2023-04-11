import { btcAssetId, btcChainId } from '@shapeshiftoss/caip'

import type { ParsedTx } from '../../../../types'
import { TransferType, TxStatus } from '../../../../types'
import { TransactionParser } from '../index'
import standardNoChange from './mockData/standardNoChange'
import standardWithChange from './mockData/standardWithChange'

const txParser = new TransactionParser({ chainId: btcChainId, assetId: btcAssetId })

describe('parseTx', () => {
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
})
