import { bscAssetId, bscChainId } from '@shapeshiftoss/caip'
import type { evm } from '@shapeshiftoss/common-api'
import { ZRX_ETHEREUM_PROXY_CONTRACT } from '@shapeshiftoss/contracts'
import { describe, expect, it, vi } from 'vitest'

import type { Trade, Transfer } from '../../../../types'
import { Dex, TradeType, TransferType, TxStatus } from '../../../../types'
import type { ParsedTx } from '../../../parser'
import { V1Api } from '../../index'
import { TransactionParser } from '../index'
import bep20Approve from './mockData/bep20Approve'
import bep721 from './mockData/bep721'
import bep1155 from './mockData/bep1155'
import bnbSelfSend from './mockData/bnbSelfSend'
import bnbStandard from './mockData/bnbStandard'
import { busdToken, usdtToken } from './mockData/tokens'
import tokenSelfSend from './mockData/tokenSelfSend'
import tokenStandard from './mockData/tokenStandard'
import zrxTradeBnbToBusd from './mockData/zrxTradeBnbToBusd'
import zrxTradeBusdToBnb from './mockData/zrxTradeBusdToBnb'
import zrxTradeUsdtToBusd from './mockData/zrxTradeUsdtToBusd'

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
  chainId: bscChainId,
  assetId: bscAssetId,
  api: mockedApi,
  midgardUrl: '',
})

describe('parseTx', () => {
  describe('standard', () => {
    describe('bnb', () => {
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
    })

    describe('token', () => {
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

    describe('bep721', () => {
      it('should be able to parse mempool send', async () => {
        const { txMempool } = bep721
        const address = '0xc86d6a700B82C62A14458858d17d0e6a3942f424'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: 'eip155:56',
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(actual).toEqual(expected)
      })

      it('should be able to parse send', async () => {
        const { tx } = bep721
        const address = '0xc86d6a700B82C62A14458858d17d0e6a3942f424'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: 'eip155:56',
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          fee: {
            assetId: bscAssetId,
            value: '201048000000000',
          },
          data: {
            parser: 'nft',
            mediaById: { '6201612': tokenMetadata.media },
          },
          transfers: [
            {
              type: TransferType.Send,
              to: '0x26bCA820c78DDe0349960457960e7b80548E37e3',
              from: address,
              assetId: 'eip155:56/bep721:0xd7c79abeb8d8b21e7638a8aadfdcc1438d24b483/6201612',
              totalValue: '1',
              components: [{ value: '1' }],
              id: '6201612',
              token: {
                contract: '0xd7C79AbEb8d8B21e7638A8aADfdcC1438d24B483',
                decimals: 18,
                name: 'TAP FANTASY SKIN',
                symbol: 'TFSKIN',
              },
            },
          ],
        }

        const actual = await txParser.parse(tx, address)

        expect(actual).toEqual(expected)
      })

      it('should be able to parse mempool receive', async () => {
        const { txMempool } = bep721
        const address = '0x26bCA820c78DDe0349960457960e7b80548E37e3'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: 'eip155:56',
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(actual).toEqual(expected)
      })

      it('should be able to parse receive', async () => {
        const { tx } = bep721
        const address = '0x26bCA820c78DDe0349960457960e7b80548E37e3'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: 'eip155:56',
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          data: {
            parser: 'nft',
            mediaById: { '6201612': tokenMetadata.media },
          },
          transfers: [
            {
              type: TransferType.Receive,
              to: address,
              from: '0xc86d6a700B82C62A14458858d17d0e6a3942f424',
              assetId: 'eip155:56/bep721:0xd7c79abeb8d8b21e7638a8aadfdcc1438d24b483/6201612',
              totalValue: '1',
              components: [{ value: '1' }],
              id: '6201612',
              token: {
                contract: '0xd7C79AbEb8d8B21e7638A8aADfdcC1438d24B483',
                decimals: 18,
                name: 'TAP FANTASY SKIN',
                symbol: 'TFSKIN',
              },
            },
          ],
        }

        const actual = await txParser.parse(tx, address)

        expect(actual).toEqual(expected)
      })
    })

    describe('bep1155', () => {
      it('should be able to parse mempool send', async () => {
        const { txMempool } = bep1155
        const address = '0x606a712666DD5EeF29d2F0360874C8ED1E72A007'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: 'eip155:56',
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(actual).toEqual(expected)
      })

      it('should be able to parse send', async () => {
        const { tx } = bep1155
        const address = '0x606a712666DD5EeF29d2F0360874C8ED1E72A007'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: 'eip155:56',
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          fee: {
            assetId: bscAssetId,
            value: '209277000000000',
          },
          data: {
            parser: 'nft',
            mediaById: { '550': tokenMetadata.media },
          },
          transfers: [
            {
              type: TransferType.Send,
              to: '0xD3106B990148CFED6D36eaC4E2066B9356dB423b',
              from: address,
              assetId: 'eip155:56/bep1155:0xe4395bd1dae0687dcf6bfbafdaa8edb5a2065eef/550',
              totalValue: '1',
              components: [{ value: '1' }],
              id: '550',
              token: {
                contract: '0xE4395bD1Dae0687dcF6BfBaFdaa8edB5a2065Eef',
                decimals: 18,
                name: 'Nfterrium Nomad',
                symbol: 'NTMN',
              },
            },
          ],
        }

        const actual = await txParser.parse(tx, address)

        expect(actual).toEqual(expected)
      })

      it('should be able to parse mempool receive', async () => {
        const { txMempool } = bep1155
        const address = '0xD3106B990148CFED6D36eaC4E2066B9356dB423b'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: 'eip155:56',
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(actual).toEqual(expected)
      })

      it('should be able to parse receive', async () => {
        const { tx } = bep1155
        const address = '0xD3106B990148CFED6D36eaC4E2066B9356dB423b'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: 'eip155:56',
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          data: {
            parser: 'nft',
            mediaById: { '550': tokenMetadata.media },
          },
          transfers: [
            {
              type: TransferType.Receive,
              to: address,
              from: '0x606a712666DD5EeF29d2F0360874C8ED1E72A007',
              assetId: 'eip155:56/bep1155:0xe4395bd1dae0687dcf6bfbafdaa8edb5a2065eef/550',
              totalValue: '1',
              components: [{ value: '1' }],
              id: '550',
              token: {
                contract: '0xE4395bD1Dae0687dcF6BfBaFdaa8edB5a2065Eef',
                decimals: 18,
                name: 'Nfterrium Nomad',
                symbol: 'NTMN',
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

  describe('zrx trade', () => {
    it('should be able to parse token -> bnb', async () => {
      const { tx } = zrxTradeBusdToBnb
      const address = '0x1bE0Db7727c53b16a22af5Cb12F4680e784cf7eF'
      const trade: Trade = { dexName: Dex.Zrx, type: TradeType.Trade }

      const buyTransfer: Transfer = {
        assetId: bscAssetId,
        components: [{ value: '4904343838640863' }],
        from: ZRX_ETHEREUM_PROXY_CONTRACT,
        to: address,
        totalValue: '4904343838640863',
        type: TransferType.Receive,
      }

      const sellTransfer: Transfer = {
        assetId: 'eip155:56/bep20:0xe9e7cea3dedca5984780bafc599bd69add087d56',
        components: [{ value: '1489033385864185057' }],
        from: address,
        to: '0x51e6D27FA57373d8d4C256231241053a70Cb1d93',
        token: busdToken,
        totalValue: '1489033385864185057',
        type: TransferType.Send,
      }

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        address,
        chainId: bscChainId,
        confirmations: tx.confirmations,
        data: { parser: 'zrx' },
        status: TxStatus.Confirmed,
        fee: {
          value: '467445000000000',
          assetId: bscAssetId,
        },
        transfers: [sellTransfer, buyTransfer],
        trade,
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse bnb -> token', async () => {
      const { tx } = zrxTradeBnbToBusd
      const address = '0xb8687c5f88399b0E70DD69F2fBd2200957cDaf38'
      const trade: Trade = { dexName: Dex.Zrx, type: TradeType.Trade }

      const buyTransfer: Transfer = {
        assetId: 'eip155:56/bep20:0xe9e7cea3dedca5984780bafc599bd69add087d56',
        components: [{ value: '326087208829856917029' }],
        from: '0xdB6f1920A889355780aF7570773609Bd8Cb1f498',
        to: address,
        token: busdToken,
        totalValue: '326087208829856917029',
        type: TransferType.Receive,
      }

      const sellTransfer: Transfer = {
        assetId: bscAssetId,
        components: [{ value: '1077638000000000000' }],
        from: address,
        to: ZRX_ETHEREUM_PROXY_CONTRACT,
        totalValue: '1077638000000000000',
        type: TransferType.Send,
      }

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        address,
        chainId: bscChainId,
        confirmations: tx.confirmations,
        data: { parser: 'zrx' },
        status: TxStatus.Confirmed,
        fee: {
          value: '1200110000000000',
          assetId: bscAssetId,
        },
        transfers: [sellTransfer, buyTransfer],
        trade,
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })

    it('should be able to parse token -> token', async () => {
      const { tx } = zrxTradeUsdtToBusd
      const address = '0xba599D1526952c14779e6A9D31D912C6A02f5B9C'
      const trade: Trade = { dexName: Dex.Zrx, type: TradeType.Trade }

      const buyTransfer: Transfer = {
        assetId: 'eip155:56/bep20:0xe9e7cea3dedca5984780bafc599bd69add087d56',
        components: [{ value: '1918012446944444331677' }],
        from: '0xdB6f1920A889355780aF7570773609Bd8Cb1f498',
        to: address,
        token: busdToken,
        totalValue: '1918012446944444331677',
        type: TransferType.Receive,
      }

      const sellTransfer: Transfer = {
        assetId: 'eip155:56/bep20:0x55d398326f99059ff775485246999027b3197955',
        components: [{ value: '1917821751000000000000' }],
        from: address,
        to: '0xdB6f1920A889355780aF7570773609Bd8Cb1f498',
        token: usdtToken,
        totalValue: '1917821751000000000000',
        type: TransferType.Send,
      }

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        blockHash: tx.blockHash,
        address,
        chainId: bscChainId,
        confirmations: tx.confirmations,
        data: { parser: 'zrx' },
        status: TxStatus.Confirmed,
        fee: {
          value: '1283480000000000',
          assetId: bscAssetId,
        },
        transfers: [sellTransfer, buyTransfer],
        trade,
      }

      const actual = await txParser.parse(tx, address)

      expect(actual).toEqual(expected)
    })
  })
})
