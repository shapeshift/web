import { avalancheAssetId, avalancheChainId } from '@shapeshiftoss/caip'

import {
  Dex,
  Trade,
  TradeType,
  Transfer,
  TransferType,
  TxParser,
  TxStatus
} from '../../../../types'
import { ParsedTx, ParsedTx as Tx, TxParser as EvmTxParser } from '../../../parser'
import { TransactionParser } from '../index'
import avaxSelfSend from './mockData/avaxSelfSend'
import avaxStandard from './mockData/avaxStandard'
import erc20Approve from './mockData/erc20Approve'
import { usdcToken, wrappedBitcoin, wrappedEther } from './mockData/tokens'
import tokenSelfSend from './mockData/tokenSelfSend'
import tokenStandard from './mockData/tokenStandard'
import zrxTradeAvaxToWeth from './mockData/zrxTradeAvaxToWeth'
import zrxTradeWethToAvax from './mockData/zrxTradeWethToAvax'
import zrxTradeWethToWbtc from './mockData/zrxTradeWethToWbtc'

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

  describe('zrx trade', () => {
    it('should be able to parse token -> avax', async () => {
      const { tx } = zrxTradeWethToAvax
      const address = '0xc2090e54B0Db09a1515f203aEA6Ed62A115548eC'
      const trade: Trade = {
        dexName: Dex.Zrx,
        type: TradeType.Trade
      }
      const buyTransfer: Transfer = {
        assetId: avalancheAssetId,
        components: [
          {
            value: '1419200313588432512'
          }
        ],
        from: '0xdB6f1920A889355780aF7570773609Bd8Cb1f498',
        to: '0xc2090e54B0Db09a1515f203aEA6Ed62A115548eC',
        token: undefined,
        totalValue: '1419200313588432512',
        type: TransferType.Receive
      }

      const sellTransfer: Transfer = {
        assetId: 'eip155:43114/erc20:0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab',
        components: [
          {
            value: '20000000000000000'
          }
        ],
        from: '0xc2090e54B0Db09a1515f203aEA6Ed62A115548eC',
        to: '0xdB6f1920A889355780aF7570773609Bd8Cb1f498',
        token: wrappedEther,
        totalValue: '20000000000000000',
        type: TransferType.Send
      }

      const expected: Tx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        address,
        chainId: avalancheChainId,
        confirmations: tx.confirmations,
        data: {
          method: undefined,
          parser: TxParser.ZRX
        },
        status: TxStatus.Confirmed,
        fee: {
          value: '6626525000000000',
          assetId: avalancheAssetId
        },
        transfers: [sellTransfer, buyTransfer],
        trade
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse avax -> token', async () => {
      const { tx } = zrxTradeAvaxToWeth
      const address = '0xc2090e54B0Db09a1515f203aEA6Ed62A115548eC'
      const trade: Trade = {
        dexName: Dex.Zrx,
        type: TradeType.Trade
      }

      const buyTransfer: Transfer = {
        assetId: 'eip155:43114/erc20:0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab',
        components: [
          {
            value: '819115016056635'
          }
        ],
        from: '0xdB6f1920A889355780aF7570773609Bd8Cb1f498',
        to: '0xc2090e54B0Db09a1515f203aEA6Ed62A115548eC',
        token: wrappedEther,
        totalValue: '819115016056635',
        type: TransferType.Receive
      }

      const sellTransfer: Transfer = {
        assetId: avalancheAssetId,
        components: [
          {
            value: '50000000000000000'
          }
        ],
        from: '0xc2090e54B0Db09a1515f203aEA6Ed62A115548eC',
        to: '0xDef1C0ded9bec7F1a1670819833240f027b25EfF',
        token: undefined,
        totalValue: '50000000000000000',
        type: TransferType.Send
      }

      const expected: Tx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        address,
        chainId: avalancheChainId,
        confirmations: tx.confirmations,
        data: {
          method: undefined,
          parser: TxParser.ZRX
        },
        status: TxStatus.Confirmed,
        fee: {
          value: '6346125000000000',
          assetId: avalancheAssetId
        },
        transfers: [sellTransfer, buyTransfer],
        trade
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse token -> token', async () => {
      const { tx } = zrxTradeWethToWbtc
      const address = '0xc2090e54B0Db09a1515f203aEA6Ed62A115548eC'
      const trade: Trade = {
        dexName: Dex.Zrx,
        type: TradeType.Trade
      }

      const buyTransfer: Transfer = {
        assetId: 'eip155:43114/erc20:0x50b7545627a5162f82a992c33b87adc75187b218',
        components: [
          {
            value: '14605'
          }
        ],
        from: '0xdB6f1920A889355780aF7570773609Bd8Cb1f498',
        to: '0xc2090e54B0Db09a1515f203aEA6Ed62A115548eC',
        token: wrappedBitcoin,
        totalValue: '14605',
        type: TransferType.Receive
      }

      const sellTransfer: Transfer = {
        assetId: 'eip155:43114/erc20:0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab',
        components: [
          {
            value: '2000000000000000'
          }
        ],
        from: '0xc2090e54B0Db09a1515f203aEA6Ed62A115548eC',
        to: '0xdB6f1920A889355780aF7570773609Bd8Cb1f498',
        token: wrappedEther,
        totalValue: '2000000000000000',
        type: TransferType.Send
      }

      const expected: Tx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        address,
        chainId: avalancheChainId,
        confirmations: tx.confirmations,
        data: {
          method: undefined,
          parser: TxParser.ZRX
        },
        status: TxStatus.Confirmed,
        fee: {
          value: '8329875000000000',
          assetId: avalancheAssetId
        },
        transfers: [sellTransfer, buyTransfer],
        trade
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })
  })
})
