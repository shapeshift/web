import { dogeAssetId, dogeChainId } from '@shapeshiftoss/caip'

import type { ParsedTx } from '../../../../types'
import { TransferType, TxStatus } from '../../../../types'
import { TransactionParser } from '../index'
import standardNoChange from './mockData/standardNoChange'
import standardWithChange from './mockData/standardWithChange'

const txParser = new TransactionParser({ chainId: dogeChainId, assetId: dogeAssetId })

describe('parseTx', () => {
  describe('standard', () => {
    it('should be able to parse standard send with no change mempool', async () => {
      const { txMempool } = standardNoChange
      const address = 'D7N7452tBhydYh9ecEfFpQgw8yXXapxRCP'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        address,
        chainId: dogeChainId,
        fee: {
          assetId: dogeAssetId,
          value: '12050688',
        },
        transfers: [
          {
            type: TransferType.Send,
            from: 'D7N7452tBhydYh9ecEfFpQgw8yXXapxRCP',
            to: 'DQZkYpyV2YzkyqnZDqekbKuSD6VGq6CqHb',
            assetId: dogeAssetId,
            totalValue: '750000000',
            components: [{ value: '750000000' }],
          },
        ],
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse standard send with no change', async () => {
      const { tx } = standardNoChange
      const address = 'D7N7452tBhydYh9ecEfFpQgw8yXXapxRCP'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: dogeChainId,
        fee: {
          assetId: dogeAssetId,
          value: '12050688',
        },
        transfers: [
          {
            type: TransferType.Send,
            from: 'D7N7452tBhydYh9ecEfFpQgw8yXXapxRCP',
            to: 'DQZkYpyV2YzkyqnZDqekbKuSD6VGq6CqHb',
            assetId: dogeAssetId,
            totalValue: '750000000',
            components: [{ value: '750000000' }],
          },
        ],
      }

      const actual = await txParser.parse(tx, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse standard receive no change mempool', async () => {
      const { txMempool } = standardNoChange
      const address = 'DQZkYpyV2YzkyqnZDqekbKuSD6VGq6CqHb'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        address,
        chainId: dogeChainId,
        transfers: [
          {
            type: TransferType.Receive,
            from: 'D7N7452tBhydYh9ecEfFpQgw8yXXapxRCP',
            to: 'DQZkYpyV2YzkyqnZDqekbKuSD6VGq6CqHb',
            assetId: dogeAssetId,
            totalValue: '737949312',
            components: [{ value: '737949312' }],
          },
        ],
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse standard receive no change', async () => {
      const { tx } = standardNoChange
      const address = 'DQZkYpyV2YzkyqnZDqekbKuSD6VGq6CqHb'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: dogeChainId,
        transfers: [
          {
            type: TransferType.Receive,
            from: 'D7N7452tBhydYh9ecEfFpQgw8yXXapxRCP',
            to: 'DQZkYpyV2YzkyqnZDqekbKuSD6VGq6CqHb',
            assetId: dogeAssetId,
            totalValue: '737949312',
            components: [{ value: '737949312' }],
          },
        ],
      }

      const actual = await txParser.parse(tx, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse standard send with change mempool', async () => {
      const { txMempool } = standardWithChange
      const address = 'DDUoTGov76gcqAEBXXpUHzSuSQkPYKze9N'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        address,
        chainId: dogeChainId,
        fee: {
          assetId: dogeAssetId,
          value: '125900000',
        },
        transfers: [
          {
            type: TransferType.Send,
            to: 'DHfvk82f2sCqsoUXzTyQSDUoF5YZVYoE1Y',
            from: 'DDUoTGov76gcqAEBXXpUHzSuSQkPYKze9N',
            assetId: dogeAssetId,
            totalValue: '70370021036118',
            components: [{ value: '70370021036118' }],
          },
          {
            type: TransferType.Receive,
            to: 'DDUoTGov76gcqAEBXXpUHzSuSQkPYKze9N',
            from: 'DDUoTGov76gcqAEBXXpUHzSuSQkPYKze9N',
            assetId: dogeAssetId,
            totalValue: '70223692253218',
            components: [{ value: '70223692253218' }],
          },
        ],
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse standard send with change', async () => {
      const { tx } = standardWithChange
      const address = 'DDUoTGov76gcqAEBXXpUHzSuSQkPYKze9N'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: dogeChainId,
        fee: {
          assetId: dogeAssetId,
          value: '125900000',
        },
        transfers: [
          {
            type: TransferType.Send,
            to: 'DHfvk82f2sCqsoUXzTyQSDUoF5YZVYoE1Y',
            from: 'DDUoTGov76gcqAEBXXpUHzSuSQkPYKze9N',
            assetId: dogeAssetId,
            totalValue: '70370021036118',
            components: [{ value: '70370021036118' }],
          },
          {
            type: TransferType.Receive,
            to: 'DDUoTGov76gcqAEBXXpUHzSuSQkPYKze9N',
            from: 'DDUoTGov76gcqAEBXXpUHzSuSQkPYKze9N',
            assetId: dogeAssetId,
            totalValue: '70223692253218',
            components: [{ value: '70223692253218' }],
          },
        ],
      }

      const actual = await txParser.parse(tx, address)

      expect(expected).toEqual(actual)
    })
  })
})
