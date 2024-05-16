import { arbitrumNovaAssetId, arbitrumNovaChainId } from '@shapeshiftoss/caip'
import type { evm } from '@shapeshiftoss/common-api'
import { describe, expect, it, vi } from 'vitest'

import { TransferType, TxStatus } from '../../../../types'
import type { ParsedTx } from '../../../parser'
import { V1Api } from '../../index'
import { TransactionParser } from '../index'
import erc20Approve from './mockData/erc20Approve'
import erc721 from './mockData/erc721'
import erc1155 from './mockData/erc1155'
import ethSelfSend from './mockData/ethSelfSend'
import ethStandard from './mockData/ethStandard'
import { usdcToken } from './mockData/tokens'
import tokenSelfSend from './mockData/tokenSelfSend'
import tokenStandard from './mockData/tokenStandard'

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
  chainId: arbitrumNovaChainId,
  assetId: arbitrumNovaAssetId,
  api: mockedApi,
})

describe('parseTx', () => {
  describe('standard', () => {
    describe('eth', () => {
      it('should be able to parse eth mempool send', async () => {
        const { txMempool } = ethStandard
        const address = '0xD056D4B6FCdcEa982F7E70F085Bbb1f9AbcD19f9'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: arbitrumNovaChainId,
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [
            {
              type: TransferType.Send,
              to: '0x80C67432656d59144cEFf962E8fAF8926599bCF8',
              from: address,
              assetId: arbitrumNovaAssetId,
              totalValue: '202000000000009001',
              components: [{ value: '202000000000009001' }],
            },
          ],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(expected).toEqual(actual)
      })

      it('should be able to parse eth send', async () => {
        const { tx } = ethStandard
        const address = '0xD056D4B6FCdcEa982F7E70F085Bbb1f9AbcD19f9'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: arbitrumNovaChainId,
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          fee: {
            assetId: arbitrumNovaAssetId,
            value: '2123600000000',
          },
          transfers: [
            {
              type: TransferType.Send,
              to: '0x80C67432656d59144cEFf962E8fAF8926599bCF8',
              from: address,
              assetId: arbitrumNovaAssetId,
              totalValue: '202000000000009001',
              components: [{ value: '202000000000009001' }],
            },
          ],
        }

        const actual = await txParser.parse(tx, address)

        expect(expected).toEqual(actual)
      })

      it('should be able to parse eth mempool receive', async () => {
        const { txMempool } = ethStandard
        const address = '0x80C67432656d59144cEFf962E8fAF8926599bCF8'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: arbitrumNovaChainId,
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [
            {
              type: TransferType.Receive,
              to: address,
              from: '0xD056D4B6FCdcEa982F7E70F085Bbb1f9AbcD19f9',
              assetId: arbitrumNovaAssetId,
              totalValue: '202000000000009001',
              components: [{ value: '202000000000009001' }],
            },
          ],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(expected).toEqual(actual)
      })

      it('should be able to parse eth receive', async () => {
        const { tx } = ethStandard
        const address = '0x80C67432656d59144cEFf962E8fAF8926599bCF8'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: arbitrumNovaChainId,
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          transfers: [
            {
              type: TransferType.Receive,
              to: address,
              from: '0xD056D4B6FCdcEa982F7E70F085Bbb1f9AbcD19f9',
              assetId: arbitrumNovaAssetId,
              totalValue: '202000000000009001',
              components: [{ value: '202000000000009001' }],
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
        const address = '0x41d3D33156aE7c62c094AAe2995003aE63f587B3'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: arbitrumNovaChainId,
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(expected).toEqual(actual)
      })

      it('should be able to parse token send', async () => {
        const { tx } = tokenStandard
        const address = '0x41d3D33156aE7c62c094AAe2995003aE63f587B3'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: arbitrumNovaChainId,
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          fee: {
            assetId: arbitrumNovaAssetId,
            value: '831760000000',
          },
          transfers: [
            {
              type: TransferType.Send,
              from: address,
              to: '0x8fA69f067D23ED3775ecEe954fB3B000b4D77851',
              assetId: 'eip155:42170/erc20:0x750ba8b76187092b0d1e87e28daaf484d1b5273b',
              totalValue: '140058',
              components: [{ value: '140058' }],
              token: usdcToken,
            },
          ],
        }

        const actual = await txParser.parse(tx, address)

        expect(expected).toEqual(actual)
      })

      it('should be able to parse token mempool receive', async () => {
        const { txMempool } = tokenStandard
        const address = '0x8fA69f067D23ED3775ecEe954fB3B000b4D77851'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: arbitrumNovaChainId,
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(expected).toEqual(actual)
      })

      it('should be able to parse token receive', async () => {
        const { tx } = tokenStandard
        const address = '0x8fA69f067D23ED3775ecEe954fB3B000b4D77851'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: arbitrumNovaChainId,
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          transfers: [
            {
              type: TransferType.Receive,
              from: '0x41d3D33156aE7c62c094AAe2995003aE63f587B3',
              to: address,
              assetId: 'eip155:42170/erc20:0x750ba8b76187092b0d1e87e28daaf484d1b5273b',
              totalValue: '140058',
              components: [{ value: '140058' }],
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
        const address = '0xe2c62f256EF9d6734b6C81b269ddDA33f09366Bd'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: arbitrumNovaChainId,
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [
            {
              type: TransferType.Send,
              to: '0x5188368a92B49F30f4Cf9bEF64635bCf8459c7A7',
              from: address,
              assetId: arbitrumNovaAssetId,
              totalValue: '226805763158466',
              components: [{ value: '226805763158466' }],
            },
          ],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(actual).toEqual(expected)
      })

      it('should be able to parse send', async () => {
        const { tx } = erc721
        const address = '0xe2c62f256EF9d6734b6C81b269ddDA33f09366Bd'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: arbitrumNovaChainId,
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          fee: {
            assetId: arbitrumNovaAssetId,
            value: '3244730000000',
          },
          data: {
            parser: 'nft',
            mediaById: { '9550018': tokenMetadata.media },
          },
          transfers: [
            {
              type: TransferType.Send,
              to: '0x5188368a92B49F30f4Cf9bEF64635bCf8459c7A7',
              from: address,
              assetId: arbitrumNovaAssetId,
              totalValue: '226805763158466',
              components: [{ value: '226805763158466' }],
            },
            {
              type: TransferType.Send,
              to: '0x5188368a92B49F30f4Cf9bEF64635bCf8459c7A7',
              from: address,
              assetId: 'eip155:42170/erc721:0x5188368a92b49f30f4cf9bef64635bcf8459c7a7/9550018',
              totalValue: '1',
              components: [{ value: '1' }],
              id: '9550018',
              token: {
                contract: '0x5188368a92B49F30f4Cf9bEF64635bCf8459c7A7',
                decimals: 18,
                name: 'ZeriusONFT Minis',
                symbol: 'ZRSM',
              },
            },
          ],
        }

        const actual = await txParser.parse(tx, address)

        expect(actual).toEqual(expected)
      })

      it('should be able to parse mempool receive', async () => {
        const { txMempool } = erc721
        const address = '0x5188368a92B49F30f4Cf9bEF64635bCf8459c7A7'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: arbitrumNovaChainId,
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [
            {
              type: TransferType.Receive,
              to: address,
              from: '0xe2c62f256EF9d6734b6C81b269ddDA33f09366Bd',
              assetId: arbitrumNovaAssetId,
              totalValue: '226805763158466',
              components: [{ value: '226805763158466' }],
            },
          ],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(actual).toEqual(expected)
      })

      it('should be able to parse receive', async () => {
        const { tx } = erc721
        const address = '0x5188368a92B49F30f4Cf9bEF64635bCf8459c7A7'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: arbitrumNovaChainId,
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          data: {
            parser: 'nft',
            mediaById: { '9550018': tokenMetadata.media },
          },
          transfers: [
            {
              type: TransferType.Receive,
              to: address,
              from: '0xe2c62f256EF9d6734b6C81b269ddDA33f09366Bd',
              assetId: arbitrumNovaAssetId,
              totalValue: '226805763158466',
              components: [{ value: '226805763158466' }],
            },
            {
              type: TransferType.Receive,
              to: address,
              from: '0xe2c62f256EF9d6734b6C81b269ddDA33f09366Bd',
              assetId: 'eip155:42170/erc721:0x5188368a92b49f30f4cf9bef64635bcf8459c7a7/9550018',
              totalValue: '1',
              components: [{ value: '1' }],
              id: '9550018',
              token: {
                contract: '0x5188368a92B49F30f4Cf9bEF64635bCf8459c7A7',
                decimals: 18,
                name: 'ZeriusONFT Minis',
                symbol: 'ZRSM',
              },
            },
            {
              type: TransferType.Send,
              to: '0x4EE2F9B7cf3A68966c370F3eb2C16613d3235245',
              from: address,
              assetId: arbitrumNovaAssetId,
              totalValue: '170805763158466',
              components: [{ value: '170805763158466' }],
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
        const address = '0x0000000000000000000000000000000000000000'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: arbitrumNovaChainId,
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(actual).toEqual(expected)
      })

      it('should be able to parse send', async () => {
        const { tx } = erc1155
        const address = '0x0000000000000000000000000000000000000000'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: arbitrumNovaChainId,
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          data: {
            parser: 'nft',
            mediaById: { '1': tokenMetadata.media },
          },
          transfers: [
            {
              type: TransferType.Send,
              to: '0xB3d2AeEB22c927Bfc29Cbd6885134a4c3D76A705',
              from: address,
              assetId: 'eip155:42170/erc1155:0x3c5d88ba90e35bb772a5c66d36613f6801b56428/1',
              totalValue: '20',
              components: [{ value: '20' }],
              id: '1',
              token: {
                contract: '0x3C5D88Ba90e35Bb772A5c66d36613F6801b56428',
                decimals: 18,
                name: '',
                symbol: '',
              },
            },
          ],
        }

        const actual = await txParser.parse(tx, address)

        expect(actual).toEqual(expected)
      })

      it('should be able to parse mempool receive', async () => {
        const { txMempool } = erc1155
        const address = '0xDddDA6f358EACeB800C82D41CcC53676b5CC6F6c'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: arbitrumNovaChainId,
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(actual).toEqual(expected)
      })

      it('should be able to parse receive', async () => {
        const { tx } = erc1155
        const address = '0xB3d2AeEB22c927Bfc29Cbd6885134a4c3D76A705'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: arbitrumNovaChainId,
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
              from: '0x0000000000000000000000000000000000000000',
              assetId: 'eip155:42170/erc1155:0x3c5d88ba90e35bb772a5c66d36613f6801b56428/1',
              totalValue: '20',
              components: [{ value: '20' }],
              id: '1',
              token: {
                contract: '0x3C5D88Ba90e35Bb772A5c66d36613F6801b56428',
                decimals: 18,
                name: '',
                symbol: '',
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
    it('should be able to parse eth mempool', async () => {
      const { txMempool } = ethSelfSend
      const address = '0xD056D4B6FCdcEa982F7E70F085Bbb1f9AbcD19f9'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        address,
        chainId: arbitrumNovaChainId,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        transfers: [
          {
            type: TransferType.Send,
            to: address,
            from: address,
            assetId: arbitrumNovaAssetId,
            totalValue: '202000000000009001',
            components: [{ value: '202000000000009001' }],
          },
          {
            type: TransferType.Receive,
            to: address,
            from: address,
            assetId: arbitrumNovaAssetId,
            totalValue: '202000000000009001',
            components: [{ value: '202000000000009001' }],
          },
        ],
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse eth', async () => {
      const { tx } = ethSelfSend
      const address = '0xD056D4B6FCdcEa982F7E70F085Bbb1f9AbcD19f9'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        address,
        chainId: arbitrumNovaChainId,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        fee: {
          assetId: arbitrumNovaAssetId,
          value: '2123600000000',
        },
        transfers: [
          {
            type: TransferType.Send,
            to: address,
            from: address,
            assetId: arbitrumNovaAssetId,
            totalValue: '202000000000009001',
            components: [{ value: '202000000000009001' }],
          },
          {
            type: TransferType.Receive,
            to: address,
            from: address,
            assetId: arbitrumNovaAssetId,
            totalValue: '202000000000009001',
            components: [{ value: '202000000000009001' }],
          },
        ],
      }

      const actual = await txParser.parse(tx, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse token mempool', async () => {
      const { txMempool } = tokenSelfSend
      const address = '0x41d3D33156aE7c62c094AAe2995003aE63f587B3'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        address,
        chainId: arbitrumNovaChainId,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        transfers: [],
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse token', async () => {
      const { tx } = tokenSelfSend
      const address = '0x41d3D33156aE7c62c094AAe2995003aE63f587B3'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        address,
        chainId: arbitrumNovaChainId,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        fee: {
          assetId: arbitrumNovaAssetId,
          value: '831760000000',
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: address,
            assetId: 'eip155:42170/erc20:0x750ba8b76187092b0d1e87e28daaf484d1b5273b',
            totalValue: '140058',
            components: [{ value: '140058' }],
            token: usdcToken,
          },
          {
            type: TransferType.Receive,
            from: address,
            to: address,
            assetId: 'eip155:42170/erc20:0x750ba8b76187092b0d1e87e28daaf484d1b5273b',
            totalValue: '140058',
            components: [{ value: '140058' }],
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
      const address = '0x7CfF1B3eD7BAc3C9d74C33c88B33aD23ef560913'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        address,
        chainId: arbitrumNovaChainId,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        transfers: [],
        data: {
          assetId: 'eip155:42170/erc20:0x750ba8b76187092b0d1e87e28daaf484d1b5273b',
          method: 'approve',
          parser: 'erc20',
          value: '4294967295000000000000000000',
        },
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse approve', async () => {
      const { tx } = erc20Approve
      const address = '0x7CfF1B3eD7BAc3C9d74C33c88B33aD23ef560913'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        address,
        chainId: arbitrumNovaChainId,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        fee: {
          assetId: arbitrumNovaAssetId,
          value: '626630000000',
        },
        transfers: [],
        data: {
          assetId: 'eip155:42170/erc20:0x750ba8b76187092b0d1e87e28daaf484d1b5273b',
          method: 'approve',
          parser: 'erc20',
          value: '4294967295000000000000000000',
        },
      }

      const actual = await txParser.parse(tx, address)

      expect(expected).toEqual(actual)
    })
  })
})
