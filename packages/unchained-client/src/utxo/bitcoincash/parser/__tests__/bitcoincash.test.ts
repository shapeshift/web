import { bchAssetId, bchChainId } from '@shapeshiftoss/caip'

import type { ParsedTx } from '../../../../types'
import { TransferType, TxStatus } from '../../../../types'
import { TransactionParser } from '../index'
import standardNoChange from './mockData/standardNoChange'
import standardWithChange from './mockData/standardWithChange'

const txParser = new TransactionParser({ chainId: bchChainId, assetId: bchAssetId })

describe('parseTx', () => {
  describe('standard', () => {
    it('should be able to parse standard send with no change mempool', async () => {
      const { txMempool } = standardNoChange
      const address = 'bitcoincash:qq8th24ps88yzgvtdzc0eslufg5w7qjdmv6smzhjmu'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        address,
        chainId: bchChainId,
        fee: {
          assetId: bchAssetId,
          value: '185',
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: 'bitcoincash:qq5tfcdahtl0x5vt6evua3y24lcdx252zqlhz6safs',
            assetId: bchAssetId,
            totalValue: '10436903',
            components: [{ value: '10436903' }],
          },
        ],
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse standard send with no change', async () => {
      const { tx } = standardNoChange
      const address = 'bitcoincash:qq8th24ps88yzgvtdzc0eslufg5w7qjdmv6smzhjmu'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: bchChainId,
        fee: {
          assetId: bchAssetId,
          value: '185',
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: 'bitcoincash:qq5tfcdahtl0x5vt6evua3y24lcdx252zqlhz6safs',
            assetId: bchAssetId,
            totalValue: '10436903',
            components: [{ value: '10436903' }],
          },
        ],
      }

      const actual = await txParser.parse(tx, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse standard receive no change mempool', async () => {
      const { txMempool } = standardNoChange
      const address = 'bitcoincash:qq5tfcdahtl0x5vt6evua3y24lcdx252zqlhz6safs'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        address,
        chainId: bchChainId,
        transfers: [
          {
            type: TransferType.Receive,
            to: address,
            from: 'bitcoincash:qq8th24ps88yzgvtdzc0eslufg5w7qjdmv6smzhjmu',
            assetId: bchAssetId,
            totalValue: '10436718',
            components: [{ value: '10436718' }],
          },
        ],
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse standard receive no change', async () => {
      const { tx } = standardNoChange
      const address = 'bitcoincash:qq5tfcdahtl0x5vt6evua3y24lcdx252zqlhz6safs'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: bchChainId,
        transfers: [
          {
            type: TransferType.Receive,
            to: address,
            from: 'bitcoincash:qq8th24ps88yzgvtdzc0eslufg5w7qjdmv6smzhjmu',
            assetId: bchAssetId,
            totalValue: '10436718',
            components: [{ value: '10436718' }],
          },
        ],
      }

      const actual = await txParser.parse(tx, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse standard send with change mempool', async () => {
      const { txMempool } = standardWithChange
      const address = 'bitcoincash:qzyjpr89qafwuety09edgrxz0snpaqrd0vvymq6ec0'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        address,
        chainId: bchChainId,
        fee: {
          assetId: bchAssetId,
          value: '220',
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: 'bitcoincash:qzm7ax32nzkmlgf97qtq5vdmpvdx4xvjj5dlmputzn',
            assetId: bchAssetId,
            totalValue: '8758569',
            components: [{ value: '8758569' }],
          },
          {
            type: TransferType.Receive,
            to: address,
            from: address,
            assetId: bchAssetId,
            totalValue: '8752492',
            components: [{ value: '8752492' }],
          },
        ],
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse standard send with change', async () => {
      const { tx } = standardWithChange
      const address = 'bitcoincash:qzyjpr89qafwuety09edgrxz0snpaqrd0vvymq6ec0'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        address,
        chainId: bchChainId,
        fee: {
          assetId: bchAssetId,
          value: '220',
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: 'bitcoincash:qzm7ax32nzkmlgf97qtq5vdmpvdx4xvjj5dlmputzn',
            assetId: bchAssetId,
            totalValue: '8758569',
            components: [{ value: '8758569' }],
          },
          {
            type: TransferType.Receive,
            to: address,
            from: address,
            assetId: bchAssetId,
            totalValue: '8752492',
            components: [{ value: '8752492' }],
          },
        ],
      }

      const actual = await txParser.parse(tx, address)

      expect(expected).toEqual(actual)
    })
  })
})
