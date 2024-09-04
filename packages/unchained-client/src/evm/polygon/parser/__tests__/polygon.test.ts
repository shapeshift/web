import { polygonAssetId, polygonChainId } from '@shapeshiftoss/caip'
import type { evm } from '@shapeshiftoss/common-api'
import { ZRX_POLYGON_PROXY_CONTRACT } from '@shapeshiftoss/contracts'
import { describe, expect, it, vi } from 'vitest'

import type { Trade, Transfer } from '../../../../types'
import { Dex, TradeType, TransferType, TxStatus } from '../../../../types'
import type { ParsedTx } from '../../../parser'
import { V1Api } from '../../index'
import { TransactionParser } from '../index'
import erc20Approve from './mockData/erc20Approve'
import erc721 from './mockData/erc721'
import erc1155 from './mockData/erc1155'
import maticSelfSend from './mockData/maticSelfSend'
import maticStandard from './mockData/maticStandard'
import { usdcToken, usdtToken } from './mockData/tokens'
import tokenSelfSend from './mockData/tokenSelfSend'
import tokenStandard from './mockData/tokenStandard'
import zrxTradeMaticToUsdc from './mockData/zrxTradeMaticToUsdc'
import zrxTradeUsdcToMatic from './mockData/zrxTradeUsdcToMatic'
import zrxTradeUsdcToUsdt from './mockData/zrxTradeUsdcToUsdt'

vi.hoisted(() => {
  vi.stubEnv('REACT_APP_FEATURE_NFT_METADATA', 'true')
})

const mockedApi = vi.mocked(new V1Api())

const tokenMetadata: evm.TokenMetadata = {
  name: 'Foxy',
  description: 'The foxiest Fox',
  media: { url: 'http://foxy.fox', type: 'image' },
}

mockedApi.getTokenMetadata = vi.fn().mockResolvedValue(tokenMetadata)

const txParser = new TransactionParser({
  rpcUrl: '',
  chainId: polygonChainId,
  assetId: polygonAssetId,
  api: mockedApi,
})

describe('parseTx', () => {
  describe('standard', () => {
    describe('matic', () => {
      it('should be able to parse matic mempool send', async () => {
        const { txMempool } = maticStandard
        const address = '0xC070A61D043189D99bbf4baA58226bf0991c7b11'

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
              to: '0x7DE23FDA0C4243E9588CCe39819d53854965Ad77',
              from: address,
              assetId: polygonAssetId,
              totalValue: '4079513530000000000',
              components: [{ value: '4079513530000000000' }],
            },
          ],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(expected).toEqual(actual)
      })

      it('should be able to parse matic send', async () => {
        const { tx } = maticStandard
        const address = '0xC070A61D043189D99bbf4baA58226bf0991c7b11'

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
            value: '5618286173997000',
          },
          transfers: [
            {
              type: TransferType.Send,
              to: '0x7DE23FDA0C4243E9588CCe39819d53854965Ad77',
              from: address,
              assetId: polygonAssetId,
              totalValue: '4079513530000000000',
              components: [{ value: '4079513530000000000' }],
            },
          ],
        }

        const actual = await txParser.parse(tx, address)

        expect(expected).toEqual(actual)
      })

      it('should be able to parse matic mempool receive', async () => {
        const { txMempool } = maticStandard
        const address = '0x7DE23FDA0C4243E9588CCe39819d53854965Ad77'

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
              from: '0xC070A61D043189D99bbf4baA58226bf0991c7b11',
              assetId: polygonAssetId,
              totalValue: '4079513530000000000',
              components: [{ value: '4079513530000000000' }],
            },
          ],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(expected).toEqual(actual)
      })

      it('should be able to parse matic receive', async () => {
        const { tx } = maticStandard
        const address = '0x7DE23FDA0C4243E9588CCe39819d53854965Ad77'

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
              from: '0xC070A61D043189D99bbf4baA58226bf0991c7b11',
              assetId: polygonAssetId,
              totalValue: '4079513530000000000',
              components: [{ value: '4079513530000000000' }],
            },
          ],
        }

        const actual = await txParser.parse(tx, address)

        expect(expected).toEqual(actual)
      })
    })

    describe('token', () => {
      it('should be able to parse token mempool send', async () => {
        const { txMempool } = tokenStandard
        const address = '0xfA8a5D52aFCCAF40A0999ab9347D1Ba7Edc5395b'

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
        const address = '0xfA8a5D52aFCCAF40A0999ab9347D1Ba7Edc5395b'

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
            value: '12798989060278680',
          },
          transfers: [
            {
              type: TransferType.Send,
              from: address,
              to: '0xaE5f1D2309272557a4f2a3C954f51aF12104A2Ce',
              assetId: 'eip155:137/erc20:0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
              totalValue: '700000000',
              components: [{ value: '700000000' }],
              token: usdcToken,
            },
          ],
        }

        const actual = await txParser.parse(tx, address)

        expect(expected).toEqual(actual)
      })

      it('should be able to parse token mempool receive', async () => {
        const { txMempool } = tokenStandard
        const address = '0xaE5f1D2309272557a4f2a3C954f51aF12104A2Ce'

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
        const address = '0xaE5f1D2309272557a4f2a3C954f51aF12104A2Ce'

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
              from: '0xfA8a5D52aFCCAF40A0999ab9347D1Ba7Edc5395b',
              to: address,
              assetId: 'eip155:137/erc20:0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
              totalValue: '700000000',
              components: [{ value: '700000000' }],
              token: usdcToken,
            },
          ],
        }

        const actual = await txParser.parse(tx, address)

        expect(expected).toEqual(actual)
      })
    })

    describe('erc721', () => {
      it('should be able to parse mempool send', async () => {
        const { txMempool } = erc721
        const address = '0x841c64caDA7837e48463Cb022d93f33D1f63356c'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: 'eip155:137',
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(actual).toEqual(expected)
      })

      it('should be able to parse send', async () => {
        const { tx } = erc721
        const address = '0x841c64caDA7837e48463Cb022d93f33D1f63356c'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: 'eip155:137',
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          fee: {
            assetId: polygonAssetId,
            value: '12631422480372220',
          },
          data: {
            parser: 'nft',
            mediaById: { '289167': tokenMetadata.media },
          },
          transfers: [
            {
              type: TransferType.Send,
              to: '0xD8D534C68B52A1ae7Af3BB0Bc6C51E97e9007F0F',
              from: address,
              assetId: 'eip155:137/erc721:0xa4b37be40f7b231ee9574c4b16b7ddb7eacdc99b/289167',
              totalValue: '1',
              components: [{ value: '1' }],
              id: '289167',
              token: {
                contract: '0xA4B37bE40F7b231Ee9574c4b16b7DDb7EAcDC99B',
                decimals: 18,
                name: 'Objekt',
                symbol: 'OBJEKT',
              },
            },
          ],
        }

        const actual = await txParser.parse(tx, address)

        expect(actual).toEqual(expected)
      })

      it('should be able to parse mempool receive', async () => {
        const { txMempool } = erc721
        const address = '0xD8D534C68B52A1ae7Af3BB0Bc6C51E97e9007F0F'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: 'eip155:137',
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(actual).toEqual(expected)
      })

      it('should be able to parse receive', async () => {
        const { tx } = erc721
        const address = '0xD8D534C68B52A1ae7Af3BB0Bc6C51E97e9007F0F'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: 'eip155:137',
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          data: {
            parser: 'nft',
            mediaById: { '289167': tokenMetadata.media },
          },
          transfers: [
            {
              type: TransferType.Receive,
              to: address,
              from: '0x841c64caDA7837e48463Cb022d93f33D1f63356c',
              assetId: 'eip155:137/erc721:0xa4b37be40f7b231ee9574c4b16b7ddb7eacdc99b/289167',
              totalValue: '1',
              components: [{ value: '1' }],
              id: '289167',
              token: {
                contract: '0xA4B37bE40F7b231Ee9574c4b16b7DDb7EAcDC99B',
                decimals: 18,
                name: 'Objekt',
                symbol: 'OBJEKT',
              },
            },
          ],
        }

        const actual = await txParser.parse(tx, address)

        expect(actual).toEqual(expected)
      })
    })

    describe('erc1155', () => {
      it('should be able to parse mempool send', async () => {
        const { txMempool } = erc1155
        const address = '0xf877411aF8c079fdF69468101fa6723702bc0b20'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: 'eip155:137',
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(actual).toEqual(expected)
      })

      it('should be able to parse send', async () => {
        const { tx } = erc1155
        const address = '0xf877411aF8c079fdF69468101fa6723702bc0b20'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: 'eip155:137',
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          fee: {
            assetId: polygonAssetId,
            value: '9111117137219334',
          },
          data: {
            parser: 'nft',
            mediaById: { '1': tokenMetadata.media },
          },
          transfers: [
            {
              type: TransferType.Send,
              to: '0x2D76998A35A933BA8213B1B6924DBe25dF98BcFE',
              from: address,
              assetId: 'eip155:137/erc1155:0xc934f270079741fb66f19e1cf16267078c5a8394/1',
              totalValue: '1',
              components: [{ value: '1' }],
              id: '1',
              token: {
                contract: '0xc934F270079741fB66F19e1CF16267078C5a8394',
                decimals: 18,
                name: 'BK',
                symbol: 'Broker NFT',
              },
            },
          ],
        }

        const actual = await txParser.parse(tx, address)

        expect(actual).toEqual(expected)
      })

      it('should be able to parse mempool receive', async () => {
        const { txMempool } = erc1155
        const address = '0x2D76998A35A933BA8213B1B6924DBe25dF98BcFE'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: 'eip155:137',
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(actual).toEqual(expected)
      })

      it('should be able to parse receive', async () => {
        const { tx } = erc1155
        const address = '0x2D76998A35A933BA8213B1B6924DBe25dF98BcFE'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: 'eip155:137',
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          data: {
            parser: 'nft',
            mediaById: { '1': tokenMetadata.media },
          },
          transfers: [
            {
              type: TransferType.Receive,
              to: address,
              from: '0xf877411aF8c079fdF69468101fa6723702bc0b20',
              assetId: 'eip155:137/erc1155:0xc934f270079741fb66f19e1cf16267078c5a8394/1',
              totalValue: '1',
              components: [{ value: '1' }],
              id: '1',
              token: {
                contract: '0xc934F270079741fB66F19e1CF16267078C5a8394',
                decimals: 18,
                name: 'BK',
                symbol: 'Broker NFT',
              },
            },
          ],
        }

        const actual = await txParser.parse(tx, address)

        expect(actual).toEqual(expected)
      })
    })
  })

  describe('self send', () => {
    it('should be able to parse matic mempool', async () => {
      const { txMempool } = maticSelfSend
      const address = '0xC070A61D043189D99bbf4baA58226bf0991c7b11'

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
            to: address,
            from: address,
            assetId: polygonAssetId,
            totalValue: '4079513530000000000',
            components: [{ value: '4079513530000000000' }],
          },
          {
            type: TransferType.Receive,
            to: address,
            from: address,
            assetId: polygonAssetId,
            totalValue: '4079513530000000000',
            components: [{ value: '4079513530000000000' }],
          },
        ],
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse matic', async () => {
      const { tx } = maticSelfSend
      const address = '0xC070A61D043189D99bbf4baA58226bf0991c7b11'

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
          value: '5618286173997000',
        },
        transfers: [
          {
            type: TransferType.Send,
            to: address,
            from: address,
            assetId: polygonAssetId,
            totalValue: '4079513530000000000',
            components: [{ value: '4079513530000000000' }],
          },
          {
            type: TransferType.Receive,
            to: address,
            from: address,
            assetId: polygonAssetId,
            totalValue: '4079513530000000000',
            components: [{ value: '4079513530000000000' }],
          },
        ],
      }

      const actual = await txParser.parse(tx, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse token mempool', async () => {
      const { txMempool } = tokenSelfSend
      const address = '0xfA8a5D52aFCCAF40A0999ab9347D1Ba7Edc5395b'

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

    it('should be able to parse token', async () => {
      const { tx } = tokenSelfSend
      const address = '0xfA8a5D52aFCCAF40A0999ab9347D1Ba7Edc5395b'

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
          value: '12798989060278680',
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: address,
            assetId: 'eip155:137/erc20:0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
            totalValue: '700000000',
            components: [{ value: '700000000' }],
            token: usdcToken,
          },
          {
            type: TransferType.Receive,
            from: address,
            to: address,
            assetId: 'eip155:137/erc20:0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
            totalValue: '700000000',
            components: [{ value: '700000000' }],
            token: usdcToken,
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
      const address = '0x526fE73a7B21cB7A16b277b2d067B2C8478e5249'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        address,
        chainId: polygonChainId,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        transfers: [],
        data: {
          assetId: 'eip155:137/erc20:0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
          method: 'approve',
          parser: 'erc20',
          value: '1051800000',
        },
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse approve', async () => {
      const { tx } = erc20Approve
      const address = '0x526fE73a7B21cB7A16b277b2d067B2C8478e5249'

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
          value: '14285788388942070',
        },
        transfers: [],
        data: {
          assetId: 'eip155:137/erc20:0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
          method: 'approve',
          parser: 'erc20',
          value: '1051800000',
        },
      }

      const actual = await txParser.parse(tx, address)

      expect(expected).toEqual(actual)
    })
  })

  describe('zrx trade', () => {
    it('should be able to parse matic -> token', async () => {
      const { tx } = zrxTradeMaticToUsdc
      const address = '0x244E3290b263cb89506D09A4E692EDA9e6a4536e'
      const trade: Trade = { dexName: Dex.Zrx, type: TradeType.Trade }

      const sellTransfer: Transfer = {
        assetId: polygonAssetId,
        components: [{ value: '6982000000000000000' }],
        from: address,
        to: ZRX_POLYGON_PROXY_CONTRACT,
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
      expect(actual).toEqual(expected)
    })

    it('should be able to parse token -> matic', async () => {
      const { tx } = zrxTradeUsdcToMatic
      const address = '0xD2d75fAB0c3aABb355e825A0819805dfC7b60036'
      const trade: Trade = { dexName: Dex.Zrx, type: TradeType.Trade }

      const sellTransfer: Transfer = {
        assetId: 'eip155:137/erc20:0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
        components: [{ value: '553874000' }],
        from: address,
        to: '0xdB6f1920A889355780aF7570773609Bd8Cb1f498',
        token: usdcToken,
        totalValue: '553874000',
        type: TransferType.Send,
      }

      const buyTransfer: Transfer = {
        assetId: polygonAssetId,
        components: [{ value: '500436721291789495553' }],
        from: '0xdB6f1920A889355780aF7570773609Bd8Cb1f498',
        to: address,
        totalValue: '500436721291789495553',
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
          value: '56842042908977284',
          assetId: polygonAssetId,
        },
        transfers: [sellTransfer, buyTransfer],
        trade,
      }

      const actual = await txParser.parse(tx, address)
      expect(actual).toEqual(expected)
    })

    it('should be able to parse token -> token', async () => {
      const { tx } = zrxTradeUsdcToUsdt
      const address = '0x46E0F76F12CC05AB3232503429741195dF52f3BC'
      const trade: Trade = { dexName: Dex.Zrx, type: TradeType.Trade }

      const sellTransfer: Transfer = {
        assetId: 'eip155:137/erc20:0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
        components: [{ value: '15100000' }],
        from: address,
        to: '0xdB6f1920A889355780aF7570773609Bd8Cb1f498',
        token: usdcToken,
        totalValue: '15100000',
        type: TransferType.Send,
      }

      const buyTransfer: Transfer = {
        assetId: 'eip155:137/erc20:0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
        components: [{ value: '15092185' }],
        from: '0xdB6f1920A889355780aF7570773609Bd8Cb1f498',
        to: address,
        token: usdtToken,
        totalValue: '15092185',
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
          value: '73878411661814366',
          assetId: polygonAssetId,
        },
        transfers: [sellTransfer, buyTransfer],
        trade,
      }
      const actual = await txParser.parse(tx, address)
      expect(actual).toEqual(expected)
    })
  })
})
