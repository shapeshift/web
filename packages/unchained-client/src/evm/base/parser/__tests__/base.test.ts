import { baseAssetId, baseChainId } from '@shapeshiftoss/caip'
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
  chainId: baseChainId,
  assetId: baseAssetId,
  api: mockedApi,
})

describe('parseTx', () => {
  describe('standard', () => {
    describe('eth', () => {
      it('should be able to parse eth mempool send', async () => {
        const { txMempool } = ethStandard
        const address = '0xB4807865A786E9E9E26E6A9610F2078e7fc507fB'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: baseChainId,
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [
            {
              type: TransferType.Send,
              to: '0x0EF2639cdafD25A8ecB09e8bcfd9d237D002aD8F',
              from: address,
              assetId: baseAssetId,
              totalValue: '77742470000000000',
              components: [{ value: '77742470000000000' }],
            },
          ],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(expected).toEqual(actual)
      })

      it('should be able to parse eth send', async () => {
        const { tx } = ethStandard
        const address = '0xB4807865A786E9E9E26E6A9610F2078e7fc507fB'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: baseChainId,
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          fee: {
            assetId: baseAssetId,
            value: '1810578389898',
          },
          transfers: [
            {
              type: TransferType.Send,
              to: '0x0EF2639cdafD25A8ecB09e8bcfd9d237D002aD8F',
              from: address,
              assetId: baseAssetId,
              totalValue: '77742470000000000',
              components: [{ value: '77742470000000000' }],
            },
          ],
        }

        const actual = await txParser.parse(tx, address)

        expect(expected).toEqual(actual)
      })

      it('should be able to parse eth mempool receive', async () => {
        const { txMempool } = ethStandard
        const address = '0x0EF2639cdafD25A8ecB09e8bcfd9d237D002aD8F'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: baseChainId,
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [
            {
              type: TransferType.Receive,
              to: address,
              from: '0xB4807865A786E9E9E26E6A9610F2078e7fc507fB',
              assetId: baseAssetId,
              totalValue: '77742470000000000',
              components: [{ value: '77742470000000000' }],
            },
          ],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(expected).toEqual(actual)
      })

      it('should be able to parse eth receive', async () => {
        const { tx } = ethStandard
        const address = '0x0EF2639cdafD25A8ecB09e8bcfd9d237D002aD8F'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: baseChainId,
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          transfers: [
            {
              type: TransferType.Receive,
              to: address,
              from: '0xB4807865A786E9E9E26E6A9610F2078e7fc507fB',
              assetId: baseAssetId,
              totalValue: '77742470000000000',
              components: [{ value: '77742470000000000' }],
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
        const address = '0x8a474fdab0f58d3FA92A9D2E56125262B2f9d6Ed'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: baseChainId,
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(expected).toEqual(actual)
      })

      it('should be able to parse token send', async () => {
        const { tx } = tokenStandard
        const address = '0x8a474fdab0f58d3FA92A9D2E56125262B2f9d6Ed'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: baseChainId,
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          fee: {
            assetId: baseAssetId,
            value: '7413089345108',
          },
          transfers: [
            {
              type: TransferType.Send,
              from: address,
              to: '0xcb131840f8843984ED6C5c0E3280ec8514F0f827',
              assetId: 'eip155:8453/erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
              totalValue: '47089764',
              components: [{ value: '47089764' }],
              token: usdcToken,
            },
          ],
        }

        const actual = await txParser.parse(tx, address)

        expect(expected).toEqual(actual)
      })

      it('should be able to parse token mempool receive', async () => {
        const { txMempool } = tokenStandard
        const address = '0xcb131840f8843984ED6C5c0E3280ec8514F0f827'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: baseChainId,
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(expected).toEqual(actual)
      })

      it('should be able to parse token receive', async () => {
        const { tx } = tokenStandard
        const address = '0xcb131840f8843984ED6C5c0E3280ec8514F0f827'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: baseChainId,
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          transfers: [
            {
              type: TransferType.Receive,
              from: '0x8a474fdab0f58d3FA92A9D2E56125262B2f9d6Ed',
              to: address,
              assetId: 'eip155:8453/erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
              totalValue: '47089764',
              components: [{ value: '47089764' }],
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
        const address = '0x4325775d28154FE505169cD1b680aF5c0C589cA8'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: baseChainId,
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(actual).toEqual(expected)
      })

      it('should be able to parse send', async () => {
        const { tx } = erc721
        const address = '0x4325775d28154FE505169cD1b680aF5c0C589cA8'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: baseChainId,
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          fee: {
            assetId: baseAssetId,
            value: '11417223915522',
          },
          data: {
            parser: 'nft',
            mediaById: { '4': tokenMetadata.media },
          },
          transfers: [
            {
              type: TransferType.Send,
              to: '0x059B8628B3b533b31bD62E67DA7168C2b4C2A25F',
              from: address,
              assetId: 'eip155:8453/erc721:0xbe7ad8e7352c0af6f72a8b1db3be08f2deaf4b4c/4',
              totalValue: '1',
              components: [{ value: '1' }],
              id: '4',
              token: {
                contract: '0xBE7ad8e7352C0aF6f72a8b1dB3be08f2dEAf4B4C',
                decimals: 18,
                name: 'Opepen Paint Editions',
                symbol: 'OPE',
              },
            },
          ],
        }

        const actual = await txParser.parse(tx, address)

        expect(actual).toEqual(expected)
      })

      it('should be able to parse mempool receive', async () => {
        const { txMempool } = erc721
        const address = '0x059B8628B3b533b31bD62E67DA7168C2b4C2A25F'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: baseChainId,
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(actual).toEqual(expected)
      })

      it('should be able to parse receive', async () => {
        const { tx } = erc721
        const address = '0x059B8628B3b533b31bD62E67DA7168C2b4C2A25F'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: baseChainId,
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          data: {
            parser: 'nft',
            mediaById: { '4': tokenMetadata.media },
          },
          transfers: [
            {
              type: TransferType.Receive,
              to: address,
              from: '0x4325775d28154FE505169cD1b680aF5c0C589cA8',
              assetId: 'eip155:8453/erc721:0xbe7ad8e7352c0af6f72a8b1db3be08f2deaf4b4c/4',
              totalValue: '1',
              components: [{ value: '1' }],
              id: '4',
              token: {
                contract: '0xBE7ad8e7352C0aF6f72a8b1dB3be08f2dEAf4B4C',
                decimals: 18,
                name: 'Opepen Paint Editions',
                symbol: 'OPE',
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
        const address = '0xFDf655251A2066D0B3EEb9BF0FeFc49D8bcab2A8'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: baseChainId,
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(actual).toEqual(expected)
      })

      it('should be able to parse send', async () => {
        const { tx } = erc1155
        const address = '0xFDf655251A2066D0B3EEb9BF0FeFc49D8bcab2A8'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: baseChainId,
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          data: {
            parser: 'nft',
            mediaById: { '1': tokenMetadata.media },
          },
          transfers: [
            {
              type: TransferType.Send,
              to: '0xA97C1558eF6ad1E136d8Ee7E9701A72b2571Ebd5',
              from: address,
              assetId: 'eip155:8453/erc1155:0xca484d550b0e72bc8836df2a41b0c1798bed873e/1',
              totalValue: '1',
              components: [{ value: '1' }],
              id: '1',
              token: {
                contract: '0xCA484d550b0E72BC8836df2A41b0C1798beD873E',
                decimals: 18,
                name: 'National Parks',
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
        const address = '0xA97C1558eF6ad1E136d8Ee7E9701A72b2571Ebd5'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: baseChainId,
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [
            {
              type: TransferType.Send,
              to: '0xa39A5f160a1952dDf38781Bd76E402B0006912A9',
              from: address,
              assetId: baseAssetId,
              totalValue: '4000000000000000',
              components: [{ value: '4000000000000000' }],
            },
          ],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(actual).toEqual(expected)
      })

      it('should be able to parse receive', async () => {
        const { tx } = erc1155
        const address = '0xA97C1558eF6ad1E136d8Ee7E9701A72b2571Ebd5'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: baseChainId,
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          data: {
            parser: 'nft',
            mediaById: { '1': tokenMetadata.media },
          },
          fee: {
            assetId: baseAssetId,
            value: '11812251432492',
          },
          transfers: [
            {
              type: TransferType.Send,
              to: '0xa39A5f160a1952dDf38781Bd76E402B0006912A9',
              from: address,
              assetId: baseAssetId,
              totalValue: '4000000000000000',
              components: [{ value: '4000000000000000' }],
            },
            {
              type: TransferType.Receive,
              to: address,
              from: '0xFDf655251A2066D0B3EEb9BF0FeFc49D8bcab2A8',
              assetId: 'eip155:8453/erc1155:0xca484d550b0e72bc8836df2a41b0c1798bed873e/1',
              totalValue: '1',
              components: [{ value: '1' }],
              id: '1',
              token: {
                contract: '0xCA484d550b0E72BC8836df2A41b0C1798beD873E',
                decimals: 18,
                name: 'National Parks',
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
      const address = '0xB4807865A786E9E9E26E6A9610F2078e7fc507fB'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        address,
        chainId: baseChainId,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        transfers: [
          {
            type: TransferType.Send,
            to: address,
            from: address,
            assetId: baseAssetId,
            totalValue: '77742470000000000',
            components: [{ value: '77742470000000000' }],
          },
          {
            type: TransferType.Receive,
            to: address,
            from: address,
            assetId: baseAssetId,
            totalValue: '77742470000000000',
            components: [{ value: '77742470000000000' }],
          },
        ],
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse eth', async () => {
      const { tx } = ethSelfSend
      const address = '0xB4807865A786E9E9E26E6A9610F2078e7fc507fB'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        address,
        chainId: baseChainId,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        fee: {
          assetId: baseAssetId,
          value: '1810578389898',
        },
        transfers: [
          {
            type: TransferType.Send,
            to: address,
            from: address,
            assetId: baseAssetId,
            totalValue: '77742470000000000',
            components: [{ value: '77742470000000000' }],
          },
          {
            type: TransferType.Receive,
            to: address,
            from: address,
            assetId: baseAssetId,
            totalValue: '77742470000000000',
            components: [{ value: '77742470000000000' }],
          },
        ],
      }

      const actual = await txParser.parse(tx, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse token mempool', async () => {
      const { txMempool } = tokenSelfSend
      const address = '0x8a474fdab0f58d3FA92A9D2E56125262B2f9d6Ed'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        address,
        chainId: baseChainId,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        transfers: [],
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse token', async () => {
      const { tx } = tokenSelfSend
      const address = '0x8a474fdab0f58d3FA92A9D2E56125262B2f9d6Ed'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        address,
        chainId: baseChainId,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        fee: {
          assetId: baseAssetId,
          value: '7413089345108',
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: address,
            assetId: 'eip155:8453/erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
            totalValue: '47089764',
            components: [{ value: '47089764' }],
            token: usdcToken,
          },
          {
            type: TransferType.Receive,
            from: address,
            to: address,
            assetId: 'eip155:8453/erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
            totalValue: '47089764',
            components: [{ value: '47089764' }],
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
      const address = '0xaC9a7d5AeDaCccF110315fB6354cACa910774687'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        address,
        chainId: baseChainId,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        transfers: [],
        data: {
          assetId: 'eip155:8453/erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
          method: 'approve',
          parser: 'erc20',
          value: '217966134',
        },
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse approve', async () => {
      const { tx } = erc20Approve
      const address = '0xaC9a7d5AeDaCccF110315fB6354cACa910774687'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        address,
        chainId: baseChainId,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        fee: {
          assetId: baseAssetId,
          value: '3020282099965',
        },
        transfers: [],
        data: {
          assetId: 'eip155:8453/erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
          method: 'approve',
          parser: 'erc20',
          value: '217966134',
        },
      }

      const actual = await txParser.parse(tx, address)

      expect(expected).toEqual(actual)
    })
  })
})
