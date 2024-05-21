import { gnosisAssetId, gnosisChainId } from '@shapeshiftoss/caip'
import type { evm } from '@shapeshiftoss/common-api'
import { describe, expect, it, vi } from 'vitest'

import { TransferType, TxStatus } from '../../../../types'
import type { ParsedTx } from '../../../parser'
import { V1Api } from '../../index'
import { TransactionParser } from '../index'
import erc20Approve from './mockData/erc20Approve'
import erc721 from './mockData/erc721'
import erc1155 from './mockData/erc1155'
import { usdcToken } from './mockData/tokens'
import tokenSelfSend from './mockData/tokenSelfSend'
import tokenStandard from './mockData/tokenStandard'
import xdaiSelfSend from './mockData/xdaiSelfSend'
import xdaiStandard from './mockData/xdaiStandard'

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
  chainId: gnosisChainId,
  assetId: gnosisAssetId,
  api: mockedApi,
})

describe('parseTx', () => {
  describe('standard', () => {
    describe('xdai', () => {
      it('should be able to parse xdai mempool send', async () => {
        const { txMempool } = xdaiStandard
        const address = '0xecbb714842DA98B7c6FEB25937b13087ff443437'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: gnosisChainId,
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [
            {
              type: TransferType.Send,
              to: '0x36023af898264B2f4095dA46d6c316D38C88C7DC',
              from: address,
              assetId: gnosisAssetId,
              totalValue: '10000000000000000000',
              components: [{ value: '10000000000000000000' }],
            },
          ],
        }

        const actual = await txParser.parse(txMempool, address)
        expect(expected).toEqual(actual)
      })

      it('should be able to parse xdai send', async () => {
        const { tx } = xdaiStandard
        const address = '0xecbb714842DA98B7c6FEB25937b13087ff443437'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: gnosisChainId,
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          fee: {
            assetId: gnosisAssetId,
            value: '73332000000000',
          },
          transfers: [
            {
              type: TransferType.Send,
              to: '0x36023af898264B2f4095dA46d6c316D38C88C7DC',
              from: address,
              assetId: gnosisAssetId,
              totalValue: '10000000000000000000',
              components: [{ value: '10000000000000000000' }],
            },
          ],
        }

        const actual = await txParser.parse(tx, address)

        expect(expected).toEqual(actual)
      })

      it('should be able to parse xdai mempool receive', async () => {
        const { txMempool } = xdaiStandard
        const address = '0x36023af898264B2f4095dA46d6c316D38C88C7DC'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: gnosisChainId,
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [
            {
              type: TransferType.Receive,
              to: address,
              from: '0xecbb714842DA98B7c6FEB25937b13087ff443437',
              assetId: gnosisAssetId,
              totalValue: '10000000000000000000',
              components: [{ value: '10000000000000000000' }],
            },
          ],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(expected).toEqual(actual)
      })

      it('should be able to parse xdai receive', async () => {
        const { tx } = xdaiStandard
        const address = '0x36023af898264B2f4095dA46d6c316D38C88C7DC'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: gnosisChainId,
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          transfers: [
            {
              type: TransferType.Receive,
              to: address,
              from: '0xecbb714842DA98B7c6FEB25937b13087ff443437',
              assetId: gnosisAssetId,
              totalValue: '10000000000000000000',
              components: [{ value: '10000000000000000000' }],
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
        const address = '0x6B85a87d8990e77A86ab16A44b162de48BFb64E9'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: gnosisChainId,
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(expected).toEqual(actual)
      })

      it('should be able to parse token send', async () => {
        const { tx } = tokenStandard
        const address = '0xE7aeB98322CD1f9680BC5e007Cac5f02B38d8745'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: gnosisChainId,
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          fee: {
            assetId: gnosisAssetId,
            value: '176442000823396',
          },
          transfers: [
            {
              type: TransferType.Send,
              from: address,
              to: '0x6B85a87d8990e77A86ab16A44b162de48BFb64E9',
              assetId: 'eip155:100/erc20:0xddafbb505ad214d7b80b1f830fccc89b60fb7a83',
              totalValue: '50920184',
              components: [{ value: '50920184' }],
              token: usdcToken,
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
          chainId: gnosisChainId,
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(expected).toEqual(actual)
      })

      it('should be able to parse token receive', async () => {
        const { tx } = tokenStandard
        const address = '0x6B85a87d8990e77A86ab16A44b162de48BFb64E9'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: gnosisChainId,
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          transfers: [
            {
              type: TransferType.Receive,
              from: '0xE7aeB98322CD1f9680BC5e007Cac5f02B38d8745',
              to: address,
              assetId: 'eip155:100/erc20:0xddafbb505ad214d7b80b1f830fccc89b60fb7a83',
              totalValue: '50920184',
              components: [{ value: '50920184' }],
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
        const address = '0x0000000000000000000000000000000000000000'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: gnosisChainId,
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(actual).toEqual(expected)
      })

      it('should be able to parse send', async () => {
        const { tx } = erc721
        const address = '0x0000000000000000000000000000000000000000'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: gnosisChainId,
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          data: {
            parser: 'nft',
            mediaById: { '6642412': tokenMetadata.media },
          },
          transfers: [
            {
              type: TransferType.Send,
              to: '0xe484E6012b3F5ACB9aD769ca173Dc8748DEC0d72',
              from: address,
              assetId: 'eip155:100/erc721:0x22c1f6050e56d2876009903609a2cc3fef83b415/6642412',
              totalValue: '1',
              components: [{ value: '1' }],
              id: '6642412',
              token: {
                contract: '0x22C1f6050E56d2876009903609a2cC3fEf83B415',
                decimals: 18,
                name: 'POAP',
                symbol: 'The Proof of Attendance Protocol',
              },
            },
          ],
        }

        const actual = await txParser.parse(tx, address)

        expect(actual).toEqual(expected)
      })

      it('should be able to parse mempool receive', async () => {
        const { txMempool } = erc721
        const address = '0xe484E6012b3F5ACB9aD769ca173Dc8748DEC0d72'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: gnosisChainId,
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(actual).toEqual(expected)
      })

      it('should be able to parse receive', async () => {
        const { tx } = erc721
        const address = '0xe484E6012b3F5ACB9aD769ca173Dc8748DEC0d72'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: gnosisChainId,
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          data: {
            parser: 'nft',
            mediaById: { '6642412': tokenMetadata.media },
          },
          transfers: [
            {
              type: TransferType.Receive,
              to: address,
              from: '0x0000000000000000000000000000000000000000',
              assetId: 'eip155:100/erc721:0x22c1f6050e56d2876009903609a2cc3fef83b415/6642412',
              totalValue: '1',
              components: [{ value: '1' }],
              id: '6642412',
              token: {
                contract: '0x22C1f6050E56d2876009903609a2cC3fEf83B415',
                decimals: 18,
                name: 'POAP',
                symbol: 'The Proof of Attendance Protocol',
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
        const address = '0x0000000000000000000000000000000000000000'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: gnosisChainId,
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
          chainId: gnosisChainId,
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          data: {
            parser: 'nft',
            mediaById: { '12857915': tokenMetadata.media },
          },
          transfers: [
            {
              type: TransferType.Send,
              to: '0x079CB50A38e4A9b7AF49adA16201D00c25Ad965F',
              from: address,
              assetId: 'eip155:100/erc1155:0xa67f1c6c96cb5dd6ef24b07a77893693c210d846/12857915',
              totalValue: '1',
              components: [{ value: '1' }],
              id: '12857915',
              token: {
                contract: '0xa67f1C6c96CB5dD6eF24B07A77893693C210d846',
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
        const address = '0x079CB50A38e4A9b7AF49adA16201D00c25Ad965F'

        const expected: ParsedTx = {
          txid: txMempool.txid,
          blockHeight: txMempool.blockHeight,
          blockTime: txMempool.timestamp,
          address,
          chainId: gnosisChainId,
          confirmations: txMempool.confirmations,
          status: TxStatus.Pending,
          transfers: [],
        }

        const actual = await txParser.parse(txMempool, address)

        expect(actual).toEqual(expected)
      })

      it('should be able to parse receive', async () => {
        const { tx } = erc1155
        const address = '0x079CB50A38e4A9b7AF49adA16201D00c25Ad965F'

        const expected: ParsedTx = {
          txid: tx.txid,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.timestamp,
          address,
          chainId: gnosisChainId,
          confirmations: tx.confirmations,
          status: TxStatus.Confirmed,
          data: {
            parser: 'nft',
            mediaById: { '12857915': tokenMetadata.media },
          },
          transfers: [
            {
              type: TransferType.Receive,
              to: address,
              from: '0x0000000000000000000000000000000000000000',
              assetId: 'eip155:100/erc1155:0xa67f1c6c96cb5dd6ef24b07a77893693c210d846/12857915',
              totalValue: '1',
              components: [{ value: '1' }],
              id: '12857915',
              token: {
                contract: '0xa67f1C6c96CB5dD6eF24B07A77893693C210d846',
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
    it('should be able to parse xdai mempool', async () => {
      const { txMempool } = xdaiSelfSend
      const address = '0xecbb714842DA98B7c6FEB25937b13087ff443437'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        address,
        chainId: gnosisChainId,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        transfers: [
          {
            type: TransferType.Send,
            to: address,
            from: address,
            assetId: gnosisAssetId,
            totalValue: '10000000000000000000',
            components: [{ value: '10000000000000000000' }],
          },
          {
            type: TransferType.Receive,
            to: address,
            from: address,
            assetId: gnosisAssetId,
            totalValue: '10000000000000000000',
            components: [{ value: '10000000000000000000' }],
          },
        ],
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse xdai', async () => {
      const { tx } = xdaiSelfSend
      const address = '0xecbb714842DA98B7c6FEB25937b13087ff443437'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        address,
        chainId: gnosisChainId,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        fee: {
          assetId: gnosisAssetId,
          value: '73332000000000',
        },
        transfers: [
          {
            type: TransferType.Send,
            to: address,
            from: address,
            assetId: gnosisAssetId,
            totalValue: '10000000000000000000',
            components: [{ value: '10000000000000000000' }],
          },
          {
            type: TransferType.Receive,
            to: address,
            from: address,
            assetId: gnosisAssetId,
            totalValue: '10000000000000000000',
            components: [{ value: '10000000000000000000' }],
          },
        ],
      }

      const actual = await txParser.parse(tx, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse token mempool', async () => {
      const { txMempool } = tokenSelfSend
      const address = '0xecbb714842DA98B7c6FEB25937b13087ff443437'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        address,
        chainId: gnosisChainId,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        transfers: [],
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse token', async () => {
      const { tx } = tokenSelfSend
      const address = '0xE7aeB98322CD1f9680BC5e007Cac5f02B38d8745'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        address,
        chainId: gnosisChainId,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        fee: {
          assetId: gnosisAssetId,
          value: '176442000823396',
        },
        transfers: [
          {
            type: TransferType.Send,
            from: address,
            to: address,
            assetId: 'eip155:100/erc20:0xddafbb505ad214d7b80b1f830fccc89b60fb7a83',
            totalValue: '50920184',
            components: [{ value: '50920184' }],
            token: usdcToken,
          },
          {
            type: TransferType.Receive,
            from: address,
            to: address,
            assetId: 'eip155:100/erc20:0xddafbb505ad214d7b80b1f830fccc89b60fb7a83',
            totalValue: '50920184',
            components: [{ value: '50920184' }],
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
      const address = '0x7c41fa622f047Ee8259A2fd05928A4103fE9b6d6'

      const expected: ParsedTx = {
        txid: txMempool.txid,
        blockHeight: txMempool.blockHeight,
        blockTime: txMempool.timestamp,
        address,
        chainId: gnosisChainId,
        confirmations: txMempool.confirmations,
        status: TxStatus.Pending,
        transfers: [],
        data: {
          assetId: 'eip155:100/erc20:0x4b1e2c2762667331bc91648052f646d1b0d35984',
          method: 'approve',
          parser: 'erc20',
          value: '827880491152360692',
        },
      }

      const actual = await txParser.parse(txMempool, address)

      expect(expected).toEqual(actual)
    })

    it('should be able to parse approve', async () => {
      const { tx } = erc20Approve
      const address = '0x7c41fa622f047Ee8259A2fd05928A4103fE9b6d6'

      const expected: ParsedTx = {
        txid: tx.txid,
        blockHash: tx.blockHash,
        blockHeight: tx.blockHeight,
        blockTime: tx.timestamp,
        address,
        chainId: gnosisChainId,
        confirmations: tx.confirmations,
        status: TxStatus.Confirmed,
        fee: {
          assetId: gnosisAssetId,
          value: '160596000000000',
        },
        transfers: [],
        data: {
          assetId: 'eip155:100/erc20:0x4b1e2c2762667331bc91648052f646d1b0d35984',
          method: 'approve',
          parser: 'erc20',
          value: '827880491152360692',
        },
      }

      const actual = await txParser.parse(tx, address)

      expect(expected).toEqual(actual)
    })
  })
})
