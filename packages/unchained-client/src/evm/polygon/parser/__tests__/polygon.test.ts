import { polygonAssetId, polygonChainId } from '@shapeshiftoss/caip'

import { Dex, Trade, TradeType, Transfer, TransferType, TxStatus } from '../../../../types'
import type { ParsedTx } from '../../../parser'
import { TransactionParser, ZRX_POLYGON_PROXY_CONTRACT } from '../index'
// import erc20Approve from './mockData/erc20Approve'
// import ethSelfSend from './mockData/ethSelfSend'
import ethStandard from './mockData/ethStandard'
import { wmaticToken as maticToken, usdcToken, weth } from './mockData/tokens'
// import tokenSelfSend from './mockData/tokenSelfSend'
import tokenStandard from './mockData/tokenStandard'
// import zrxTradeEthToUsdc from './mockData/zrxTradeEthToUsdc'
// import zrxTradeOpToEth from './mockData/zrxTradeOpToEth'
import zrxTradeUsdcToMatic from './mockData/zrxTradeUsdcToMatic'
import zrxTradeMaticToEth from './mockData/zrxTradeMaticToEth'
import zrxTradeEthToMatic from './mockData/zrxTradeEthToMatic'

const txParser = new TransactionParser({
  rpcUrl: '',
  chainId: polygonChainId,
  assetId: polygonAssetId,
})

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
        chainId: polygonChainId,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        transfers: [
          {
            type: TransferType.Send,
            to: '0xCA312Fe911B72d2D68F27838b01f359a7b05C567',
            from: address,
            assetId: polygonAssetId,
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
        chainId: polygonChainId,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        fee: {
          assetId: polygonAssetId,
          value: '2100000000000',
        },
        transfers: [
          {
            type: TransferType.Send,
            to: '0xCA312Fe911B72d2D68F27838b01f359a7b05C567',
            from: address,
            assetId: polygonAssetId,
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
        chainId: polygonChainId,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        transfers: [
          {
            type: TransferType.Receive,
            to: address,
            from: '0x92BD687953Da50855AeE2Df0Cff282cC2d5F226b',
            assetId: polygonAssetId,
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
        chainId: polygonChainId,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        transfers: [
          {
            type: TransferType.Receive,
            to: address,
            from: '0x92BD687953Da50855AeE2Df0Cff282cC2d5F226b',
            assetId: polygonAssetId,
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
        chainId: polygonChainId,
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
        chainId: polygonChainId,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        fee: {
          assetId: polygonAssetId,
          value: '57124000000',
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: '0xA1f55aC63e174fAbaF93e6b2854Da6D85C9FDC50',
            assetId: 'eip155:137/erc20:0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0',
            totalValue: '19908484999999999942',
            components: [{ value: '19908484999999999942' }],
            token: maticToken,
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
        chainId: polygonChainId,
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
        chainId: polygonChainId,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        transfers: [
          {
            type: TransferType.Receive,
            from: '0xBcDdd1333982B26956Bf83D6fb704bC28Dfe4aBA',
            to: address,
            assetId: 'eip155:137/erc20:0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0',
            totalValue: '19908484999999999942',
            components: [{ value: '19908484999999999942' }],
            token: maticToken,
          },
        ],
      }

      const actual = await txParser.parse(tx, address)

      expect(expected).toEqual(actual)
    })
  })

  // describe('self send', () => {
  //   it('should be able to parse eth mempool', async () => {
  //     const { txMempool } = ethSelfSend
  //     const address = '0x92BD687953Da50855AeE2Df0Cff282cC2d5F226b'

  //     const expected: ParsedTx = {
  //       txid: txMempool.txid,
  //       blockHeight: txMempool.blockHeight,
  //       blockTime: txMempool.timestamp,
  //       address,
  //       chainId: polygonChainId,
  //       confirmations: txMempool.confirmations,
  //       status: TxStatus.Pending,
  //       transfers: [
  //         {
  //           type: TransferType.Send,
  //           to: address,
  //           from: address,
  //           assetId: polygonAssetId,
  //           totalValue: '15000000000000000',
  //           components: [{ value: '15000000000000000' }],
  //         },
  //         {
  //           type: TransferType.Receive,
  //           to: address,
  //           from: address,
  //           assetId: polygonAssetId,
  //           totalValue: '15000000000000000',
  //           components: [{ value: '15000000000000000' }],
  //         },
  //       ],
  //     }

  //     const actual = await txParser.parse(txMempool, address)

  //     expect(expected).toEqual(actual)
  //   })

  //   it('should be able to parse eth', async () => {
  //     const { tx } = ethSelfSend
  //     const address = '0x92BD687953Da50855AeE2Df0Cff282cC2d5F226b'

  //     const expected: ParsedTx = {
  //       txid: tx.txid,
  //       blockHash: tx.blockHash,
  //       blockHeight: tx.blockHeight,
  //       blockTime: tx.timestamp,
  //       address,
  //       chainId: polygonChainId,
  //       confirmations: tx.confirmations,
  //       status: TxStatus.Confirmed,
  //       fee: {
  //         assetId: polygonAssetId,
  //         value: '2100000000000',
  //       },
  //       transfers: [
  //         {
  //           type: TransferType.Send,
  //           to: address,
  //           from: address,
  //           assetId: polygonAssetId,
  //           totalValue: '15000000000000000',
  //           components: [{ value: '15000000000000000' }],
  //         },
  //         {
  //           type: TransferType.Receive,
  //           to: address,
  //           from: address,
  //           assetId: polygonAssetId,
  //           totalValue: '15000000000000000',
  //           components: [{ value: '15000000000000000' }],
  //         },
  //       ],
  //     }

  //     const actual = await txParser.parse(tx, address)

  //     expect(expected).toEqual(actual)
  //   })

  //   it('should be able to parse token mempool', async () => {
  //     const { txMempool } = tokenSelfSend
  //     const address = '0xBcDdd1333982B26956Bf83D6fb704bC28Dfe4aBA'

  //     const expected: ParsedTx = {
  //       txid: txMempool.txid,
  //       blockHeight: txMempool.blockHeight,
  //       blockTime: txMempool.timestamp,
  //       address,
  //       chainId: polygonChainId,
  //       confirmations: txMempool.confirmations,
  //       status: TxStatus.Pending,
  //       transfers: [],
  //     }

  //     const actual = await txParser.parse(txMempool, address)

  //     expect(expected).toEqual(actual)
  //   })

  //   it('should be able to parse token', async () => {
  //     const { tx } = tokenSelfSend
  //     const address = '0xBcDdd1333982B26956Bf83D6fb704bC28Dfe4aBA'

  //     const expected: ParsedTx = {
  //       txid: tx.txid,
  //       blockHash: tx.blockHash,
  //       blockHeight: tx.blockHeight,
  //       blockTime: tx.timestamp,
  //       address,
  //       chainId: polygonChainId,
  //       confirmations: tx.confirmations,
  //       status: TxStatus.Confirmed,
  //       fee: {
  //         assetId: polygonAssetId,
  //         value: '57124000000',
  //       },
  //       transfers: [
  //         {
  //           type: TransferType.Send,
  //           from: address,
  //           to: address,
  //           assetId: 'eip155:137/erc20:0x4200000000000000000000000000000000000042',
  //           totalValue: '19908484999999999942',
  //           components: [{ value: '19908484999999999942' }],
  //           token: maticToken,
  //         },
  //         {
  //           type: TransferType.Receive,
  //           from: address,
  //           to: address,
  //           assetId: 'eip155:137/erc20:0x4200000000000000000000000000000000000042',
  //           totalValue: '19908484999999999942',
  //           components: [{ value: '19908484999999999942' }],
  //           token: maticToken,
  //         },
  //       ],
  //     }

  //     const actual = await txParser.parse(tx, address)

  //     expect(expected).toEqual(actual)
  //   })
  // })

  // describe('erc20', () => {
  //   it('should be able to parse approve mempool', async () => {
  //     const { txMempool } = erc20Approve
  //     const address = '0x0a9f0cad6277A3e7be2C5Fc8912b93A0F6Ac034b'

  //     const expected: ParsedTx = {
  //       txid: txMempool.txid,
  //       blockHeight: txMempool.blockHeight,
  //       blockTime: txMempool.timestamp,
  //       address,
  //       chainId: polygonChainId,
  //       confirmations: txMempool.confirmations,
  //       status: TxStatus.Pending,
  //       transfers: [],
  //       data: {
  //         assetId: 'eip155:137/erc20:0x7f5c764cbc14f9669b88837ca1490cca17c31607',
  //         method: 'approve',
  //         parser: 'erc20',
  //         value: '115792089237316195423570985008687907853269984665640564039457584007913129639935',
  //       },
  //     }

  //     const actual = await txParser.parse(txMempool, address)

  //     expect(expected).toEqual(actual)
  //   })

  //   it('should be able to parse approve', async () => {
  //     const { tx } = erc20Approve
  //     const address = '0x0a9f0cad6277A3e7be2C5Fc8912b93A0F6Ac034b'

  //     const expected: ParsedTx = {
  //       txid: tx.txid,
  //       blockHash: tx.blockHash,
  //       blockHeight: tx.blockHeight,
  //       blockTime: tx.timestamp,
  //       address,
  //       chainId: polygonChainId,
  //       confirmations: tx.confirmations,
  //       status: TxStatus.Confirmed,
  //       fee: {
  //         assetId: polygonAssetId,
  //         value: '53403000000',
  //       },
  //       transfers: [],
  //       data: {
  //         assetId: 'eip155:137/erc20:0x7f5c764cbc14f9669b88837ca1490cca17c31607',
  //         method: 'approve',
  //         parser: 'erc20',
  //         value: '115792089237316195423570985008687907853269984665640564039457584007913129639935',
  //       },
  //     }

  //     const actual = await txParser.parse(tx, address)

  //     expect(expected).toEqual(actual)
  //   })
  // })

  describe('zrx trade', () => {
    it('should be able to parse eth -> token', async () => {
      const { tx } = zrxTradeEthToMatic
      const address = '0xB1889e16CF7569D41705c9dacC55F3ff46182Fd2'
      const trade: Trade = { dexName: Dex.Zrx, type: TradeType.Trade }

      const sellTransfer: Transfer = {
        assetId: 'eip155:137/erc20:0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
        components: [{ value: '18584222436627066' }],
        from: address,
        to: '0xdB6f1920A889355780aF7570773609Bd8Cb1f498',
        token: weth,
        totalValue: '18584222436627066',
        type: TransferType.Send,
      }

      const buyTransfer: Transfer = {
        assetId: polygonAssetId,
        components: [{ value: '33234499956238748695' }],
        from: '0xdB6f1920A889355780aF7570773609Bd8Cb1f498',
        to: address,
        token: undefined,
        totalValue: '33234499956238748695',
        type: TransferType.Receive,
      }

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        address,
        chainId: polygonChainId,
        confirmations: tx.confirmations,
        data: { parser: 'zrx' },
        status: TxStatus.Confirmed,
        fee: {
          value: '58627128284278820',
          assetId: polygonAssetId,
        },
        transfers: [sellTransfer, buyTransfer],
        trade,
      }

      const actual = await txParser.parse(tx, address)

      console.log(actual)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse token -> matic', async () => {
      const { tx } = zrxTradeMaticToEth
      const address = '0xB42D57F10F05100d856De8d7bF9d76F8FEE01EeF'
      const trade: Trade = { dexName: Dex.Zrx, type: TradeType.Trade }

      const sellTransfer: Transfer = {
        assetId: 'eip155:137/slip44:60',
        components: [{ value: '105000000000000000000' }],
        from: address,
        to: ZRX_POLYGON_PROXY_CONTRACT,
        token: undefined,
        totalValue: '105000000000000000000',
        type: TransferType.Send,
      }

      const buyTransfer: Transfer = {
        assetId: 'eip155:137/erc20:0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
        components: [{ value: '58656209302271987' }],
        from: '0xdB6f1920A889355780aF7570773609Bd8Cb1f498',
        to: address,
        token: weth,
        totalValue: '58656209302271987',
        type: TransferType.Receive,
      }

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        address,
        chainId: polygonChainId,
        confirmations: tx.confirmations,
        data: { parser: 'zrx' },
        status: TxStatus.Confirmed,
        fee: {
          value: '69742464000000000',
          assetId: 'eip155:137/slip44:60',
        },
        transfers: [sellTransfer, buyTransfer],
        trade,
      }

      const actual = await txParser.parse(tx, address)
      expect(actual).toEqual(expected)
    })

    it('should be able to parse token -> token', async () => {
      const { tx } = zrxTradeUsdcToMatic
      const address = '0x244E3290b263cb89506D09A4E692EDA9e6a4536e'
      const trade: Trade = { dexName: Dex.Zrx, type: TradeType.Trade }

      const sellTransfer: Transfer = {
        assetId: 'eip155:137/slip44:60',
        components: [{ value: '6982000000000000000' }],
        from: address,
        to: ZRX_POLYGON_PROXY_CONTRACT,
        token: maticToken,
        totalValue: '6982000000000000000',
        type: TransferType.Send,
      }

      const buyTransfer: Transfer = {
        assetId: 'eip155:137/erc20:0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
        components: [{ value: '8091180' }],
        from: '0xdB6f1920A889355780aF7570773609Bd8Cb1f498',
        to: address,
        token: usdcToken,
        totalValue: '8091180',
        type: TransferType.Receive,
      }

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        address,
        chainId: polygonChainId,
        confirmations: tx.confirmations,
        data: { parser: 'zrx' },
        status: TxStatus.Confirmed,
        fee: {
          value: '73889132778766292',
          assetId: polygonAssetId,
        },
        transfers: [sellTransfer, buyTransfer],
        trade,
      }
      const actual = await txParser.parse(tx, address)
      console.log(actual)
      expect(actual).toEqual(expected)
    })
  })
})