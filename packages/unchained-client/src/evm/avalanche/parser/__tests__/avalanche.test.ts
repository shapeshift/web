import { avalancheAssetId, avalancheChainId } from '@shapeshiftoss/caip'

import { TransferType, TxStatus } from '../../../../types'
import { ParsedTx, TxParser as EvmTxParser } from '../../../parser'
import { TransactionParser } from '../index'
import avaxSelfSend from './mockData/avaxSelfSend'
import avaxStandard from './mockData/avaxStandard'
import erc20Approve from './mockData/erc20Approve'
import { usdcToken } from './mockData/tokens'
import tokenSelfSend from './mockData/tokenSelfSend'
import tokenStandard from './mockData/tokenStandard'

const txParser = new TransactionParser({ rpcUrl: '', chainId: avalancheChainId })

describe('parseTx', () => {
  describe('standard', () => {
    it('should be able to parse avax mempool send', async () => {
      const { txMempool } = avaxStandard
      const address = '0x9Da5812111DCBD65fF9b736874a89751A4F0a2F8'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        address,
        chainId: avalancheChainId,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        transfers: [
          {
            type: TransferType.Send,
            to: '0x744d17684Cb717daAA3530c9840c7501BB29fAD0',
            from: address,
            assetId: avalancheAssetId,
            totalValue: '6350190000000000000',
            components: [{ value: '6350190000000000000' }]
          }
        ]
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse avax send', async () => {
      const { tx } = avaxStandard
      const address = '0x9Da5812111DCBD65fF9b736874a89751A4F0a2F8'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        address,
        chainId: avalancheChainId,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        fee: {
          assetId: avalancheAssetId,
          value: '573508559337000'
        },
        transfers: [
          {
            type: TransferType.Send,
            to: '0x744d17684Cb717daAA3530c9840c7501BB29fAD0',
            from: address,
            assetId: avalancheAssetId,
            totalValue: '6350190000000000000',
            components: [{ value: '6350190000000000000' }]
          }
        ]
      }

      const actual = await txParser.parse(tx, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse avax mempool receive', async () => {
      const { txMempool } = avaxStandard
      const address = '0x744d17684Cb717daAA3530c9840c7501BB29fAD0'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        address,
        chainId: avalancheChainId,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        transfers: [
          {
            type: TransferType.Receive,
            to: address,
            from: '0x9Da5812111DCBD65fF9b736874a89751A4F0a2F8',
            assetId: avalancheAssetId,
            totalValue: '6350190000000000000',
            components: [{ value: '6350190000000000000' }]
          }
        ]
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse avax receive', async () => {
      const { tx } = avaxStandard
      const address = '0x744d17684Cb717daAA3530c9840c7501BB29fAD0'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        address,
        chainId: avalancheChainId,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        transfers: [
          {
            type: TransferType.Receive,
            to: address,
            from: '0x9Da5812111DCBD65fF9b736874a89751A4F0a2F8',
            assetId: avalancheAssetId,
            totalValue: '6350190000000000000',
            components: [{ value: '6350190000000000000' }]
          }
        ]
      }

      const actual = await txParser.parse(tx, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse token mempool send', async () => {
      const { txMempool } = tokenStandard
      const address = '0x56b5a6c24Cb8Da581125be06361d5Cd95d7EA65b'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        address,
        chainId: avalancheChainId,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        transfers: []
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse token send', async () => {
      const { tx } = tokenStandard
      const address = '0x56b5a6c24Cb8Da581125be06361d5Cd95d7EA65b'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        address,
        chainId: avalancheChainId,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        fee: {
          assetId: avalancheAssetId,
          value: '1736704000000000'
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: '0x64e13a11b87A9025F6F4fcB0c61563984f3D58Df',
            assetId: 'eip155:43114/erc20:0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
            totalValue: '143199292',
            components: [{ value: '143199292' }],
            token: usdcToken
          }
        ]
      }

      const actual = await txParser.parse(tx, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse token mempool receive', async () => {
      const { txMempool } = tokenStandard
      const address = '0x64e13a11b87A9025F6F4fcB0c61563984f3D58Df'

      console.log({ txMempool })

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        address,
        chainId: avalancheChainId,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        transfers: []
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse token receive', async () => {
      const { tx } = tokenStandard
      const address = '0x64e13a11b87A9025F6F4fcB0c61563984f3D58Df'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        address,
        chainId: avalancheChainId,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        transfers: [
          {
            type: TransferType.Receive,
            from: '0x56b5a6c24Cb8Da581125be06361d5Cd95d7EA65b',
            to: address,
            assetId: 'eip155:43114/erc20:0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
            totalValue: '143199292',
            components: [{ value: '143199292' }],
            token: usdcToken
          }
        ]
      }

      const actual = await txParser.parse(tx, address)

      expect(expected).toEqual(actual)
    })
  })

  describe('self send', () => {
    it('should be able to parse avax mempool', async () => {
      const { txMempool } = avaxSelfSend
      const address = '0x9Da5812111DCBD65fF9b736874a89751A4F0a2F8'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        address,
        chainId: avalancheChainId,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        transfers: [
          {
            type: TransferType.Send,
            to: address,
            from: address,
            assetId: avalancheAssetId,
            totalValue: '6350190000000000000',
            components: [{ value: '6350190000000000000' }]
          },
          {
            type: TransferType.Receive,
            to: address,
            from: address,
            assetId: avalancheAssetId,
            totalValue: '6350190000000000000',
            components: [{ value: '6350190000000000000' }]
          }
        ]
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse avax', async () => {
      const { tx } = avaxSelfSend
      const address = '0x9Da5812111DCBD65fF9b736874a89751A4F0a2F8'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        address,
        chainId: avalancheChainId,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        fee: {
          assetId: avalancheAssetId,
          value: '573508559337000'
        },
        transfers: [
          {
            type: TransferType.Send,
            to: address,
            from: address,
            assetId: avalancheAssetId,
            totalValue: '6350190000000000000',
            components: [{ value: '6350190000000000000' }]
          },
          {
            type: TransferType.Receive,
            to: address,
            from: address,
            assetId: avalancheAssetId,
            totalValue: '6350190000000000000',
            components: [{ value: '6350190000000000000' }]
          }
        ]
      }

      const actual = await txParser.parse(tx, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse token mempool', async () => {
      const { txMempool } = tokenSelfSend
      const address = '0x56b5a6c24Cb8Da581125be06361d5Cd95d7EA65b'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        address,
        chainId: avalancheChainId,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        transfers: []
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse token', async () => {
      const { tx } = tokenSelfSend
      const address = '0x56b5a6c24Cb8Da581125be06361d5Cd95d7EA65b'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        address,
        chainId: avalancheChainId,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        fee: {
          assetId: avalancheAssetId,
          value: '1736704000000000'
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: address,
            assetId: 'eip155:43114/erc20:0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
            totalValue: '143199292',
            components: [{ value: '143199292' }],
            token: usdcToken
          },
          {
            type: TransferType.Receive,
            from: address,
            to: address,
            assetId: 'eip155:43114/erc20:0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
            totalValue: '143199292',
            components: [{ value: '143199292' }],
            token: usdcToken
          }
        ]
      }

      const actual = await txParser.parse(tx, address)

      expect(expected).toEqual(actual)
    })
  })

  describe('erc20', () => {
    it('should be able to parse approve mempool', async () => {
      const { txMempool } = erc20Approve
      const address = '0xA82a74B86fE11FB430Ce7A529C37efAd82ea222d'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        address,
        chainId: avalancheChainId,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        transfers: [],
        data: {
          assetId: 'eip155:43114/erc20:0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
          method: 'approve',
          parser: EvmTxParser.ERC20
        }
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse approve', async () => {
      const { tx } = erc20Approve
      const address = '0xA82a74B86fE11FB430Ce7A529C37efAd82ea222d'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        address,
        chainId: avalancheChainId,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        fee: {
          assetId: avalancheAssetId,
          value: '1645985000000000'
        },
        transfers: [],
        data: {
          assetId: 'eip155:43114/erc20:0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
          method: 'approve',
          parser: EvmTxParser.ERC20
        }
      }

      const actual = await txParser.parse(tx, address)

      expect(expected).toEqual(actual)
    })
  })
})
