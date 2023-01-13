import { optimismAssetId, optimismChainId } from '@shapeshiftoss/caip'

import { TransferType, TxStatus } from '../../../../types'
import { ParsedTx } from '../../../parser'
import { TransactionParser } from '../index'
import erc20Approve from './mockData/erc20Approve'
import ethSelfSend from './mockData/ethSelfSend'
import ethStandard from './mockData/ethStandard'
import { opToken } from './mockData/tokens'
import tokenSelfSend from './mockData/tokenSelfSend'
import tokenStandard from './mockData/tokenStandard'

const txParser = new TransactionParser({ rpcUrl: '', chainId: optimismChainId })

describe('parseTx', () => {
  describe('standard', () => {
    it('should be able to parse eth mempool send', async () => {
      const { txMempool } = ethStandard
      const address = '0x92BD687953Da50855AeE2Df0Cff282cC2d5F226b'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        address,
        chainId: optimismChainId,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        transfers: [
          {
            type: TransferType.Send,
            to: '0xCA312Fe911B72d2D68F27838b01f359a7b05C567',
            from: address,
            assetId: optimismAssetId,
            totalValue: '15000000000000000',
            components: [{ value: '15000000000000000' }],
          },
        ],
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse eth send', async () => {
      const { tx } = ethStandard
      const address = '0x92BD687953Da50855AeE2Df0Cff282cC2d5F226b'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        address,
        chainId: optimismChainId,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        fee: {
          assetId: optimismAssetId,
          value: '2100000000000',
        },
        transfers: [
          {
            type: TransferType.Send,
            to: '0xCA312Fe911B72d2D68F27838b01f359a7b05C567',
            from: address,
            assetId: optimismAssetId,
            totalValue: '15000000000000000',
            components: [{ value: '15000000000000000' }],
          },
        ],
      }

      const actual = await txParser.parse(tx, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse eth mempool receive', async () => {
      const { txMempool } = ethStandard
      const address = '0xCA312Fe911B72d2D68F27838b01f359a7b05C567'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        address,
        chainId: optimismChainId,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        transfers: [
          {
            type: TransferType.Receive,
            to: address,
            from: '0x92BD687953Da50855AeE2Df0Cff282cC2d5F226b',
            assetId: optimismAssetId,
            totalValue: '15000000000000000',
            components: [{ value: '15000000000000000' }],
          },
        ],
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse eth receive', async () => {
      const { tx } = ethStandard
      const address = '0xCA312Fe911B72d2D68F27838b01f359a7b05C567'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        address,
        chainId: optimismChainId,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        transfers: [
          {
            type: TransferType.Receive,
            to: address,
            from: '0x92BD687953Da50855AeE2Df0Cff282cC2d5F226b',
            assetId: optimismAssetId,
            totalValue: '15000000000000000',
            components: [{ value: '15000000000000000' }],
          },
        ],
      }

      const actual = await txParser.parse(tx, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse token mempool send', async () => {
      const { txMempool } = tokenStandard
      const address = '0xBcDdd1333982B26956Bf83D6fb704bC28Dfe4aBA'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        address,
        chainId: optimismChainId,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        transfers: [],
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse token send', async () => {
      const { tx } = tokenStandard
      const address = '0xBcDdd1333982B26956Bf83D6fb704bC28Dfe4aBA'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        address,
        chainId: optimismChainId,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        fee: {
          assetId: optimismAssetId,
          value: '57124000000',
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: '0xA1f55aC63e174fAbaF93e6b2854Da6D85C9FDC50',
            assetId: 'eip155:10/erc20:0x4200000000000000000000000000000000000042',
            totalValue: '19908484999999999942',
            components: [{ value: '19908484999999999942' }],
            token: opToken,
          },
        ],
      }

      const actual = await txParser.parse(tx, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse token mempool receive', async () => {
      const { txMempool } = tokenStandard
      const address = '0xA1f55aC63e174fAbaF93e6b2854Da6D85C9FDC50'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        address,
        chainId: optimismChainId,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        transfers: [],
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse token receive', async () => {
      const { tx } = tokenStandard
      const address = '0xA1f55aC63e174fAbaF93e6b2854Da6D85C9FDC50'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        address,
        chainId: optimismChainId,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        transfers: [
          {
            type: TransferType.Receive,
            from: '0xBcDdd1333982B26956Bf83D6fb704bC28Dfe4aBA',
            to: address,
            assetId: 'eip155:10/erc20:0x4200000000000000000000000000000000000042',
            totalValue: '19908484999999999942',
            components: [{ value: '19908484999999999942' }],
            token: opToken,
          },
        ],
      }

      const actual = await txParser.parse(tx, address)

      expect(expected).toEqual(actual)
    })
  })

  describe('self send', () => {
    it('should be able to parse eth mempool', async () => {
      const { txMempool } = ethSelfSend
      const address = '0x92BD687953Da50855AeE2Df0Cff282cC2d5F226b'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        address,
        chainId: optimismChainId,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        transfers: [
          {
            type: TransferType.Send,
            to: address,
            from: address,
            assetId: optimismAssetId,
            totalValue: '15000000000000000',
            components: [{ value: '15000000000000000' }],
          },
          {
            type: TransferType.Receive,
            to: address,
            from: address,
            assetId: optimismAssetId,
            totalValue: '15000000000000000',
            components: [{ value: '15000000000000000' }],
          },
        ],
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse eth', async () => {
      const { tx } = ethSelfSend
      const address = '0x92BD687953Da50855AeE2Df0Cff282cC2d5F226b'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        address,
        chainId: optimismChainId,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        fee: {
          assetId: optimismAssetId,
          value: '2100000000000',
        },
        transfers: [
          {
            type: TransferType.Send,
            to: address,
            from: address,
            assetId: optimismAssetId,
            totalValue: '15000000000000000',
            components: [{ value: '15000000000000000' }],
          },
          {
            type: TransferType.Receive,
            to: address,
            from: address,
            assetId: optimismAssetId,
            totalValue: '15000000000000000',
            components: [{ value: '15000000000000000' }],
          },
        ],
      }

      const actual = await txParser.parse(tx, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse token mempool', async () => {
      const { txMempool } = tokenSelfSend
      const address = '0xBcDdd1333982B26956Bf83D6fb704bC28Dfe4aBA'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        address,
        chainId: optimismChainId,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        transfers: [],
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse token', async () => {
      const { tx } = tokenSelfSend
      const address = '0xBcDdd1333982B26956Bf83D6fb704bC28Dfe4aBA'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        address,
        chainId: optimismChainId,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        fee: {
          assetId: optimismAssetId,
          value: '57124000000',
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: address,
            assetId: 'eip155:10/erc20:0x4200000000000000000000000000000000000042',
            totalValue: '19908484999999999942',
            components: [{ value: '19908484999999999942' }],
            token: opToken,
          },
          {
            type: TransferType.Receive,
            from: address,
            to: address,
            assetId: 'eip155:10/erc20:0x4200000000000000000000000000000000000042',
            totalValue: '19908484999999999942',
            components: [{ value: '19908484999999999942' }],
            token: opToken,
          },
        ],
      }

      const actual = await txParser.parse(tx, address)

      expect(expected).toEqual(actual)
    })
  })

  describe('erc20', () => {
    it('should be able to parse approve mempool', async () => {
      const { txMempool } = erc20Approve
      const address = '0x0a9f0cad6277A3e7be2C5Fc8912b93A0F6Ac034b'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        address,
        chainId: optimismChainId,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        transfers: [],
        data: {
          assetId: 'eip155:10/erc20:0x7f5c764cbc14f9669b88837ca1490cca17c31607',
          method: 'approve',
          parser: 'erc20',
          value: '115792089237316195423570985008687907853269984665640564039457584007913129639935',
        },
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse approve', async () => {
      const { tx } = erc20Approve
      const address = '0x0a9f0cad6277A3e7be2C5Fc8912b93A0F6Ac034b'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        address,
        chainId: optimismChainId,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        fee: {
          assetId: optimismAssetId,
          value: '53403000000',
        },
        transfers: [],
        data: {
          assetId: 'eip155:10/erc20:0x7f5c764cbc14f9669b88837ca1490cca17c31607',
          method: 'approve',
          parser: 'erc20',
          value: '115792089237316195423570985008687907853269984665640564039457584007913129639935',
        },
      }

      const actual = await txParser.parse(tx, address)

      expect(expected).toEqual(actual)
    })
  })
})
