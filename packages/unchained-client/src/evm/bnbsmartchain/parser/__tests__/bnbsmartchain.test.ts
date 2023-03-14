import { bscAssetId, bscChainId } from '@shapeshiftoss/caip'

import { TransferType, TxStatus } from '../../../../types'
import { ParsedTx } from '../../../parser'
import { TransactionParser } from '../index'
import bep20Approve from './mockData/bep20Approve'
import bnbSelfSend from './mockData/bnbSelfSend'
import bnbStandard from './mockData/bnbStandard'
import { usdtToken } from './mockData/tokens'
import tokenSelfSend from './mockData/tokenSelfSend'
import tokenStandard from './mockData/tokenStandard'

const txParser = new TransactionParser({ rpcUrl: '', chainId: bscChainId })

describe('parseTx', () => {
  describe('standard', () => {
    it('should be able to parse bnb mempool send', async () => {
      const { txMempool } = bnbStandard
      const address = '0xC480394241c76F3993ec5D121ce4F198f7844443'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        address,
        chainId: bscChainId,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        transfers: [
          {
            type: TransferType.Send,
            to: '0x215B8E1810Bb8FCcf2D90eE87631F16B5F4a895f',
            from: address,
            assetId: bscAssetId,
            totalValue: '1200000000000000000',
            components: [{ value: '1200000000000000000' }],
          },
        ],
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse bnb send', async () => {
      const { tx } = bnbStandard
      const address = '0xC480394241c76F3993ec5D121ce4F198f7844443'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        address,
        chainId: bscChainId,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        fee: {
          assetId: bscAssetId,
          value: '105000000000000',
        },
        transfers: [
          {
            type: TransferType.Send,
            to: '0x215B8E1810Bb8FCcf2D90eE87631F16B5F4a895f',
            from: address,
            assetId: bscAssetId,
            totalValue: '1200000000000000000',
            components: [{ value: '1200000000000000000' }],
          },
        ],
      }

      const actual = await txParser.parse(tx, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse bnb mempool receive', async () => {
      const { txMempool } = bnbStandard
      const address = '0x215B8E1810Bb8FCcf2D90eE87631F16B5F4a895f'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        address,
        chainId: bscChainId,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        transfers: [
          {
            type: TransferType.Receive,
            to: address,
            from: '0xC480394241c76F3993ec5D121ce4F198f7844443',
            assetId: bscAssetId,
            totalValue: '1200000000000000000',
            components: [{ value: '1200000000000000000' }],
          },
        ],
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse bnb receive', async () => {
      const { tx } = bnbStandard
      const address = '0x215B8E1810Bb8FCcf2D90eE87631F16B5F4a895f'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        address,
        chainId: bscChainId,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        transfers: [
          {
            type: TransferType.Receive,
            to: address,
            from: '0xC480394241c76F3993ec5D121ce4F198f7844443',
            assetId: bscAssetId,
            totalValue: '1200000000000000000',
            components: [{ value: '1200000000000000000' }],
          },
        ],
      }

      const actual = await txParser.parse(tx, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse token mempool send', async () => {
      const { txMempool } = tokenStandard
      const address = '0xc4178B5673633c15c3a2077A1D7f0fF1Be8a4a44'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        address,
        chainId: bscChainId,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        transfers: [],
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse token send', async () => {
      const { tx } = tokenStandard
      const address = '0xc4178B5673633c15c3a2077A1D7f0fF1Be8a4a44'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        address,
        chainId: bscChainId,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        fee: {
          assetId: bscAssetId,
          value: '180936150000000',
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: '0xC66bfff5C2ec26F60542bD3C862d7846F0783fdf',
            assetId: 'eip155:56/bep20:0x55d398326f99059ff775485246999027b3197955',
            totalValue: '200000000000000000000',
            components: [{ value: '200000000000000000000' }],
            token: usdtToken,
          },
        ],
      }

      const actual = await txParser.parse(tx, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse token mempool receive', async () => {
      const { txMempool } = tokenStandard
      const address = '0xC66bfff5C2ec26F60542bD3C862d7846F0783fdf'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        address,
        chainId: bscChainId,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        transfers: [],
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse token receive', async () => {
      const { tx } = tokenStandard
      const address = '0xC66bfff5C2ec26F60542bD3C862d7846F0783fdf'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        address,
        chainId: bscChainId,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        transfers: [
          {
            type: TransferType.Receive,
            from: '0xc4178B5673633c15c3a2077A1D7f0fF1Be8a4a44',
            to: address,
            assetId: 'eip155:56/bep20:0x55d398326f99059ff775485246999027b3197955',
            totalValue: '200000000000000000000',
            components: [{ value: '200000000000000000000' }],
            token: usdtToken,
          },
        ],
      }

      const actual = await txParser.parse(tx, address)

      expect(expected).toEqual(actual)
    })
  })

  describe('self send', () => {
    it('should be able to parse bnb mempool', async () => {
      const { txMempool } = bnbSelfSend
      const address = '0xC480394241c76F3993ec5D121ce4F198f7844443'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        address,
        chainId: bscChainId,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        transfers: [
          {
            type: TransferType.Send,
            to: address,
            from: address,
            assetId: bscAssetId,
            totalValue: '1200000000000000000',
            components: [{ value: '1200000000000000000' }],
          },
          {
            type: TransferType.Receive,
            to: address,
            from: address,
            assetId: bscAssetId,
            totalValue: '1200000000000000000',
            components: [{ value: '1200000000000000000' }],
          },
        ],
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse bnb', async () => {
      const { tx } = bnbSelfSend
      const address = '0xC480394241c76F3993ec5D121ce4F198f7844443'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        address,
        chainId: bscChainId,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        fee: {
          assetId: bscAssetId,
          value: '105000000000000',
        },
        transfers: [
          {
            type: TransferType.Send,
            to: address,
            from: address,
            assetId: bscAssetId,
            totalValue: '1200000000000000000',
            components: [{ value: '1200000000000000000' }],
          },
          {
            type: TransferType.Receive,
            to: address,
            from: address,
            assetId: bscAssetId,
            totalValue: '1200000000000000000',
            components: [{ value: '1200000000000000000' }],
          },
        ],
      }

      const actual = await txParser.parse(tx, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse token mempool', async () => {
      const { txMempool } = tokenSelfSend
      const address = '0xc4178B5673633c15c3a2077A1D7f0fF1Be8a4a44'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        address,
        chainId: bscChainId,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        transfers: [],
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse token', async () => {
      const { tx } = tokenSelfSend
      const address = '0xc4178B5673633c15c3a2077A1D7f0fF1Be8a4a44'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        address,
        chainId: bscChainId,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        fee: {
          assetId: bscAssetId,
          value: '180936150000000',
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: address,
            assetId: 'eip155:56/bep20:0x55d398326f99059ff775485246999027b3197955',
            totalValue: '200000000000000000000',
            components: [{ value: '200000000000000000000' }],
            token: usdtToken,
          },
          {
            type: TransferType.Receive,
            from: address,
            to: address,
            assetId: 'eip155:56/bep20:0x55d398326f99059ff775485246999027b3197955',
            totalValue: '200000000000000000000',
            components: [{ value: '200000000000000000000' }],
            token: usdtToken,
          },
        ],
      }

      const actual = await txParser.parse(tx, address)

      expect(expected).toEqual(actual)
    })
  })

  describe('bep20', () => {
    it('should be able to parse approve mempool', async () => {
      const { txMempool } = bep20Approve
      const address = '0xeFcdFc962cf71Da4D147aA42A72C106d557Ae7Fe'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        address,
        chainId: bscChainId,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        transfers: [],
        data: {
          assetId: 'eip155:56/bep20:0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
          method: 'approve',
          parser: 'bep20',
          value: '115792089237316195423570985008687907853269984665640564039457584007913129639935',
        },
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse approve', async () => {
      const { tx } = bep20Approve
      const address = '0xeFcdFc962cf71Da4D147aA42A72C106d557Ae7Fe'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        address,
        chainId: bscChainId,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        fee: {
          assetId: bscAssetId,
          value: '221320000000000',
        },
        transfers: [],
        data: {
          assetId: 'eip155:56/bep20:0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
          method: 'approve',
          parser: 'bep20',
          value: '115792089237316195423570985008687907853269984665640564039457584007913129639935',
        },
      }

      const actual = await txParser.parse(tx, address)

      expect(expected).toEqual(actual)
    })
  })
})
