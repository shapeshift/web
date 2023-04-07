import { ltcAssetId, ltcChainId } from '@shapeshiftoss/caip'

import type { ParsedTx } from '../../../../types'
import { TransferType, TxStatus } from '../../../../types'
import { TransactionParser } from '../index'
import standardNoChange from './mockData/standardNoChange'
import standardWithChange from './mockData/standardWithChange'

const txParser = new TransactionParser({ chainId: ltcChainId, assetId: ltcAssetId })

describe('parseTx', () => {
  describe('standard', () => {
    it('should be able to parse standard send with no change mempool', async () => {
      const { txMempool } = standardNoChange
      const address = 'LZSEtkn8TLr5EpremqDq49CSUS1xGnkbX9'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        address,
        chainId: ltcChainId,
        fee: {
          assetId: ltcAssetId,
          value: '100000',
        },
        transfers: [
          {
            type: TransferType.Send,
            from: 'LZSEtkn8TLr5EpremqDq49CSUS1xGnkbX9',
            to: 'MVZSZBDqUsvzDZSvupJyPun2fb8UZKhSi7',
            assetId: ltcAssetId,
            totalValue: '340524408',
            components: [{ value: '340524408' }],
          },
        ],
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse standard send with no change', async () => {
      const { tx } = standardNoChange
      const address = 'LZSEtkn8TLr5EpremqDq49CSUS1xGnkbX9'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: ltcChainId,
        fee: {
          assetId: ltcAssetId,
          value: '100000',
        },
        transfers: [
          {
            type: TransferType.Send,
            from: 'LZSEtkn8TLr5EpremqDq49CSUS1xGnkbX9',
            to: 'MVZSZBDqUsvzDZSvupJyPun2fb8UZKhSi7',
            assetId: ltcAssetId,
            totalValue: '340524408',
            components: [{ value: '340524408' }],
          },
        ],
      }

      const actual = await txParser.parse(tx, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse standard receive with no change mempool', async () => {
      const { txMempool } = standardNoChange
      const address = 'MVZSZBDqUsvzDZSvupJyPun2fb8UZKhSi7'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        address,
        chainId: ltcChainId,
        transfers: [
          {
            type: TransferType.Receive,
            from: 'LZSEtkn8TLr5EpremqDq49CSUS1xGnkbX9',
            to: 'MVZSZBDqUsvzDZSvupJyPun2fb8UZKhSi7',
            assetId: ltcAssetId,
            totalValue: '340424408',
            components: [{ value: '340424408' }],
          },
        ],
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse standard receive with no change', async () => {
      const { tx } = standardNoChange
      const address = 'MVZSZBDqUsvzDZSvupJyPun2fb8UZKhSi7'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: ltcChainId,
        transfers: [
          {
            type: TransferType.Receive,
            from: 'LZSEtkn8TLr5EpremqDq49CSUS1xGnkbX9',
            to: 'MVZSZBDqUsvzDZSvupJyPun2fb8UZKhSi7',
            assetId: ltcAssetId,
            totalValue: '340424408',
            components: [{ value: '340424408' }],
          },
        ],
      }

      const actual = await txParser.parse(tx, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse standard send with change mempool', async () => {
      const { txMempool } = standardWithChange
      const address = 'LWvWQ3XMoipFsAqE1EZPQFUovLea7DC1ef'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        address,
        chainId: ltcChainId,
        fee: {
          assetId: ltcAssetId,
          value: '100000',
        },
        transfers: [
          {
            type: TransferType.Send,
            to: 'LXPf92CJycUi5JogY3NXEgYqZygTkEXrsy',
            from: 'LWvWQ3XMoipFsAqE1EZPQFUovLea7DC1ef',
            assetId: ltcAssetId,
            totalValue: '147680075',
            components: [{ value: '147680075' }],
          },
          {
            type: TransferType.Receive,
            to: 'LWvWQ3XMoipFsAqE1EZPQFUovLea7DC1ef',
            from: 'LWvWQ3XMoipFsAqE1EZPQFUovLea7DC1ef',
            assetId: ltcAssetId,
            totalValue: '31465800',
            components: [{ value: '31465800' }],
          },
        ],
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse standard send with change', async () => {
      const { tx } = standardWithChange
      const address = 'LWvWQ3XMoipFsAqE1EZPQFUovLea7DC1ef'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: ltcChainId,
        fee: {
          assetId: ltcAssetId,
          value: '100000',
        },
        transfers: [
          {
            type: TransferType.Send,
            to: 'LXPf92CJycUi5JogY3NXEgYqZygTkEXrsy',
            from: 'LWvWQ3XMoipFsAqE1EZPQFUovLea7DC1ef',
            assetId: ltcAssetId,
            totalValue: '147680075',
            components: [{ value: '147680075' }],
          },
          {
            type: TransferType.Receive,
            to: 'LWvWQ3XMoipFsAqE1EZPQFUovLea7DC1ef',
            from: 'LWvWQ3XMoipFsAqE1EZPQFUovLea7DC1ef',
            assetId: ltcAssetId,
            totalValue: '31465800',
            components: [{ value: '31465800' }],
          },
        ],
      }

      const actual = await txParser.parse(tx, address)

      expect(expected).toEqual(actual)
    })
  })
})
